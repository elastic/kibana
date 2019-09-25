/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sign } from 'jsonwebtoken';
import { createHmac } from 'crypto';
import { TokenLib } from './token';
import { FrameworkLib } from './framework';
import { MemoryTokenAdapter } from './adapters/tokens/memory';
import { FrameworkAdapter } from './adapters/framework/default';
import { TokenType, Token } from './adapters/tokens/adapter_types';
import { FrameworkUser } from './adapters/framework/adapter_types';

jest.mock('./framework');

function generateJWTToken(): string {
  return sign(
    {
      policy: {
        id: 'policyId',
      },
      type: TokenType.ENROLMENT_TOKEN,
    },
    'mockedEncryptionKey'
  );
}

function hashJWTToken(token: string) {
  return createHmac('sha512', 'mockedEncryptionKey')
    .update(token)
    .digest('hex');
}

function getUser() {
  return {} as FrameworkUser;
}

describe('Token Lib', () => {
  describe('verify', () => {
    it('should verify a valid token', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const token = generateJWTToken();
      const tokenHash = hashJWTToken(token);
      tokenAdapter.create(getUser(), {
        type: TokenType.ENROLMENT_TOKEN,
        active: true,
        tokenHash,
        token,
        policy: { id: 'policyId', sharedId: 'sharedId' },
      });
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const res = await tokens.verify(getUser(), token);

      expect(res).toMatchObject({
        valid: true,
      });
    });

    it('should not verify a inactive token', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const token = generateJWTToken();
      const tokenHash = hashJWTToken(token);
      tokenAdapter.create(getUser(), {
        type: TokenType.ENROLMENT_TOKEN,
        active: false,
        token,
        tokenHash,
        policy: { id: 'policyId', sharedId: 'sharedId' },
      });
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const res = await tokens.verify(getUser(), token);

      expect(res).toMatchObject({
        valid: false,
        reason: 'Token is not active',
      });
    });

    it('should not verify a token not persisted', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const token = generateJWTToken();
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const res = await tokens.verify(getUser(), token);

      expect(res).toMatchObject({
        valid: false,
        reason: 'Token not found',
      });
    });

    it('should not verify invalid token', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const res = await tokens.verify(getUser(), 'iamnotavalidtoken');
      expect(res).toMatchObject({
        valid: false,
        reason: 'jwt malformed',
      });
    });
  });

  describe('generateEnrolmentToken', () => {
    it('should generate a valid token', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const token = await tokens.generateEnrolmentToken(getUser(), {
        id: 'policy_id',
      });

      expect(token).toBeDefined();
    });

    it('should persit the generated token', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const token = await tokens.generateEnrolmentToken(getUser(), {
        id: 'policy_id',
      });

      const tokenHash = hashJWTToken(token);
      const persistedToken = await tokenAdapter.getByTokenHash(getUser(), tokenHash);

      expect(persistedToken).toMatchObject({
        tokenHash,
        policy_id: 'policy_id',
      });
    });
  });

  describe('getEnrollmentTokenForPolicy', () => {
    it('should return null if there is no token for that policy', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const token = await tokens.getEnrollmentTokenForPolicy(getUser(), 'policy:do-not-exists');

      expect(token).toBeNull();
    });

    it('should return the token for a given policy', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      tokenAdapter.tokens['token:1'] = {
        id: 'token:1',
        policy_id: 'policy:1',
        policy_shared_id: 'shared:1',
        active: true,
        tokenHash: 'asdasd',
        token: '{}',
        type: TokenType.ENROLMENT_TOKEN,
        created_at: '2019-09-12T12:48:42+0000',
        enrollment_rules: [],
      };

      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const token = await tokens.getEnrollmentTokenForPolicy(getUser(), 'policy:1');

      expect(token).toBeDefined();
      expect((token as Token).id).toBe('token:1');
    });

    it('should regenerate a token for a given policy if the regenerate flag is true', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      tokenAdapter.tokens['tokens-0'] = {
        id: 'tokens-0',
        policy_id: 'policy:1',
        policy_shared_id: 'shared:1',
        active: true,
        token: '',
        tokenHash: 'asdasd',
        type: TokenType.ENROLMENT_TOKEN,
        created_at: '2019-09-12T12:48:42+0000',
        enrollment_rules: [],
      };

      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const token = await tokens.getEnrollmentTokenForPolicy(getUser(), 'policy:1', true);

      expect(token).toBeDefined();
      expect((token as Token).id).toBe('tokens-1');
    });
  });
});
