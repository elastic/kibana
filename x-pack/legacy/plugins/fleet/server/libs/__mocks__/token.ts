/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TokenVerificationResponse, TokenType } from '../../repositories/tokens/types';
import { FrameworkUser } from '../../adapters/framework/adapter_types';

export class TokenLib {
  private accessTokenId = 1;
  constructor() {}
  public async verify(user: FrameworkUser, token: any): Promise<TokenVerificationResponse> {
    switch (token) {
      case 'valid-enrollment-token': {
        return {
          valid: true,
          type: TokenType.ENROLLMENT_TOKEN,
          token: { policy_id: 'policyId' },
        };
      }
      default: {
        return { valid: false, reason: 'token does not exists' };
      }
    }
  }

  public async generateAccessToken(user: FrameworkUser, token: any): Promise<string> {
    return `mock-access-token-${this.accessTokenId++}`;
  }
}
