/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createHash } from 'crypto';
import { hashEuid, HASH_ALG } from './hash_euid';

describe('hashEuid', () => {
  it('returns a valid SHA-256 hash', () => {
    const hashedId = hashEuid('entity-id');
    const expectedHash = createHash(HASH_ALG).update('entity-id').digest('hex');

    expect(hashedId).toMatch(/^[a-f0-9]{64}$/);
    expect(hashedId).toBe(expectedHash);
  });
});
