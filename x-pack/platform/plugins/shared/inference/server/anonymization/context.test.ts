/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnonymizationContext } from './context';

describe('AnonymizationContext', () => {
  it('stores the salt provided at construction', () => {
    const ctx = new AnonymizationContext('my-salt');
    expect(ctx.salt).toBe('my-salt');
  });

  it('starts with an empty token map', () => {
    const ctx = new AnonymizationContext('salt');
    expect(ctx.tokenMap.size).toBe(0);
  });

  it('is per-instance: two contexts share no state', () => {
    const ctx1 = new AnonymizationContext('salt-1');
    const ctx2 = new AnonymizationContext('salt-2');

    ctx1.addToken('IP_abc123', '192.168.1.1', 'IP');

    expect(ctx1.resolveToken('IP_abc123')).toBeDefined();
    expect(ctx2.resolveToken('IP_abc123')).toBeUndefined();
  });

  describe('addToken / resolveToken', () => {
    it('stores and retrieves a token entry', () => {
      const ctx = new AnonymizationContext('salt');
      ctx.addToken('IP_abc123', '192.168.1.1', 'IP');

      const entry = ctx.resolveToken('IP_abc123');
      expect(entry).toEqual({ original: '192.168.1.1', entityClass: 'IP' });
    });

    it('returns undefined for an unknown token', () => {
      const ctx = new AnonymizationContext('salt');
      expect(ctx.resolveToken('UNKNOWN_token')).toBeUndefined();
    });

    it('is idempotent: registering the same token twice is safe', () => {
      const ctx = new AnonymizationContext('salt');
      ctx.addToken('EMAIL_xyz', 'admin@example.com', 'EMAIL');
      ctx.addToken('EMAIL_xyz', 'admin@example.com', 'EMAIL');

      expect(ctx.tokenMap.size).toBe(1);
      expect(ctx.resolveToken('EMAIL_xyz')).toEqual({
        original: 'admin@example.com',
        entityClass: 'EMAIL',
      });
    });

    it('stores multiple distinct tokens', () => {
      const ctx = new AnonymizationContext('salt');
      ctx.addToken('IP_aaa', '10.0.0.1', 'IP');
      ctx.addToken('EMAIL_bbb', 'user@host.com', 'EMAIL');

      expect(ctx.tokenMap.size).toBe(2);
      expect(ctx.resolveToken('IP_aaa')?.original).toBe('10.0.0.1');
      expect(ctx.resolveToken('EMAIL_bbb')?.original).toBe('user@host.com');
    });
  });
});
