/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sign } from 'jsonwebtoken';
import { TokenLib } from './token';
import { FrameworkLib } from './framework';
import { MemoryTokenAdapter } from './adapters/tokens/memory';
import { FrameworkAdapter } from './adapters/framework/default';
import { TokenType } from './adapters/tokens/adapter_types';

jest.mock('./framework');

function generateJWTToken(): string {
  return sign(
    {
      config: {
        id: 'configId',
        sharedId: 'sharedId',
      },
      type: TokenType.ENROLMENT_TOKEN,
    },
    'mockedEncryptionKey'
  );
}

describe('Token Lib', () => {
  describe('verify', () => {
    it('should verify a valid token', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const token = generateJWTToken();
      tokenAdapter.create({
        type: TokenType.ENROLMENT_TOKEN,
        active: true,
        token,
        config: { id: 'configId', sharedId: 'sharedId' },
      });
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const res = await tokens.verify(token);

      expect(res).toMatchObject({
        valid: true,
      });
    });

    it('should not verify a inactive token', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const token = generateJWTToken();
      tokenAdapter.create({
        type: TokenType.ENROLMENT_TOKEN,
        active: false,
        token,
        config: { id: 'configId', sharedId: 'sharedId' },
      });
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const res = await tokens.verify(token);

      expect(res).toMatchObject({
        valid: false,
        reason: 'Token is not active',
      });
    });

    it('should not verify a token not persisted', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const token = generateJWTToken();
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const res = await tokens.verify(token);

      expect(res).toMatchObject({
        valid: false,
        reason: 'Token not found',
      });
    });

    it('should not verify invalid token', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const res = await tokens.verify('iamnotavalidtoken');

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

      const token = await tokens.generateEnrolmentToken({
        id: 'config_id',
        sharedId: 'config_shared_id',
      });

      expect(token).toBeDefined();
    });

    it('should persit the generated token', async () => {
      const tokenAdapter = new MemoryTokenAdapter();
      const tokens = new TokenLib(tokenAdapter, new FrameworkLib({} as FrameworkAdapter));

      const token = await tokens.generateEnrolmentToken({
        id: 'config_id',
        sharedId: 'config_shared_id',
      });

      const persistedToken = await tokenAdapter.getByToken(token);

      expect(persistedToken).toMatchObject({
        token,
      });
    });
  });
});
