/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import { CryptoService } from './crypto_service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CryptoService();
  });

  describe('getHash', () => {
    it('returns the sha256 of a payload correctly', async () => {
      const payload = 'my payload';
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getHash(payload)).toEqual(hex);
    });

    it('creates a new instance of the hash function on each call', async () => {
      const payload = 'my payload';
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getHash(payload)).toEqual(hex);
      expect(service.getHash(payload)).toEqual(hex);
    });
  });

  describe('stringifyDeterministically', () => {
    it('deterministically stringifies an object', async () => {
      expect(
        service.stringifyDeterministically({ 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' })
      ).toEqual('{"agent.id":"8a4f500d","host.ip":"0.0.0.1"}');
    });

    it('returns null if the object is not defined', async () => {
      expect(service.stringifyDeterministically()).toEqual(null);
    });

    it('handles special characters correctly', async () => {
      expect(service.stringifyDeterministically({ [`{}=:&".'/{}}`]: `{}=:&".'{}}` })).toEqual(
        `{\"{}=:&\\\".'/{}}\":\"{}=:&\\\".'{}}\"}`
      );
    });
  });
});
