import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { faker } from '@faker-js/faker';
import { AuthDto } from './auth.dto'
import { hash } from 'argon2'
import { JwtService } from '@nestjs/jwt';
import { User } from "@prisma/client";


@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt:
    JwtService) {}

  async login(dto: AuthDto){
    const user = await this.validateUser(dto)
  }  

  async getNewTokens(refreshToken: string){
    const result = await this.jwt.verifyAsync(refreshToken)
    if(result) throw new UnauthorizedException('Invalid refresh token')

    const user = await this.prisma.user.findUnique({
      where: {
        id: result.id
      }
    })

    const tokens = await this.issueTokens(user.id)
    return {
      user: this.returnUserFields(user),
      ...tokens
    }
  }

  async register(dto: AuthDto) {
    const oldUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email
      }
    })

    if (oldUser) throw new BadRequestException('User already exist') 

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: faker.person.firstName(),
        avatarPath: faker.image.avatar(),
        phone: faker.phone.number('+1 (###) ###-##-##'),
        password: await hash(dto.password)
      }
    })
    const tokens = await this.issueTokens(user.id)

    return {
      user: this.returnUserFields(user),
      ...tokens
    }
  }

  private async issueTokens(userId: number) {
    const data = {id: userId}

    const accessToken = this.jwt.sign(data, {
      expiresIn: '1h',
    })
    const refreshToken = this.jwt.sign(data, {
      expiresIn: '7d',
    })

    return { accessToken, refreshToken }
  }
  private returnUserFields(user: User) {
    return {
      id: user.id,
      email: user.email,
    }
  }

  private validateUser(dto:AuthDto){

  }
}

