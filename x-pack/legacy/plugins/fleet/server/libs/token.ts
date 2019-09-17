/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sign as signToken, verify as verifyToken } from 'jsonwebtoken';
import { createHmac } from 'crypto';
import { TokenVerificationResponse, TokenType, Token } from './adapters/tokens/adapter_types';
import { TokenAdapter } from './adapters/tokens/adapter_types';
import { FrameworkLib } from './framework';
import { FrameworkUser } from './adapters/framework/adapter_types';

interface JWTToken {
  policy: { id: string; sharedId: string };
  type: TokenType;
}

export class TokenLib {
  constructor(
    private readonly adapter: TokenAdapter,
    private readonly frameworkLib: FrameworkLib
  ) {}

  /**
   * Verify if a token is valid
   * @param token
   */
  public async verify(user: FrameworkUser, token: string): Promise<TokenVerificationResponse> {
    try {
      const decodedToken = this._verifyJWTToken(token);

      if (decodedToken.type === TokenType.ENROLMENT_TOKEN) {
        await this._verifyPersistedToken(user, token);
      }

      return {
        valid: true,
        type: decodedToken.type,
        token: {
          policy: decodedToken.policy,
        },
      };
    } catch (error) {
      return {
        valid: false,
        reason: error.message,
      };
    }
  }

  public async generateAccessToken(
    agentId: string,
    config: { id: string; sharedId: string }
  ): Promise<string> {
    const encryptionKey = this.frameworkLib.getSetting('encryptionKey');
    const token = signToken(
      {
        type: TokenType.ACCESS_TOKEN,
        agentId,
        config,
      },
      encryptionKey
    );

    return token;
  }

  /**
   * Generate a new enrolment token for a config
   * @param config
   * @param expire
   */
  public async generateEnrolmentToken(
    user: FrameworkUser,
    policy: { id: string; sharedId: string },
    expire?: string
  ): Promise<string> {
    const encryptionKey = this.frameworkLib.getSetting('encryptionKey');

    const token = signToken(
      {
        type: TokenType.ENROLMENT_TOKEN,
        policy,
      },
      encryptionKey,
      expire
        ? {
            expiresIn: expire,
          }
        : undefined
    );
    const tokenHash = await this.hashToken(token);

    await this.adapter.create(user, {
      active: true,
      type: TokenType.ENROLMENT_TOKEN,
      tokenHash,
      token,
      policy,
    });

    return token;
  }

  public async getEnrollmentTokenForPolicy(
    user: FrameworkUser,
    policyId: string,
    regenerate?: boolean
  ): Promise<Token | null> {
    let token = await this.adapter.getByPolicyId(user, policyId);

    if (regenerate && token) {
      const policy = {
        id: token.policy_id,
        sharedId: token.policy_shared_id,
      };
      await this.adapter.delete(user, token.id);
      await this.generateEnrolmentToken(user, policy);
      token = await this.adapter.getByPolicyId(user, policyId);
    }

    return token;
  }

  public async hashToken(token: string): Promise<string> {
    const encryptionKey = this.frameworkLib.getSetting('encryptionKey');

    const hmac = createHmac('sha512', encryptionKey);

    return hmac.update(token).digest('hex');
  }

  private _verifyJWTToken(token: string): JWTToken {
    const encryptionKey = this.frameworkLib.getSetting('encryptionKey');
    const decodedToken = verifyToken(token, encryptionKey) as JWTToken;

    return decodedToken;
  }

  private async _verifyPersistedToken(user: FrameworkUser, token: string) {
    const tokenHash = await this.hashToken(token);
    const persistedToken = await this.adapter.getByTokenHash(user, tokenHash);
    if (!persistedToken) {
      throw new Error('Token not found');
    }

    if (persistedToken.active === false) {
      throw new Error('Token is not active');
    }
  }
}
