/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicKey } from 'crypto';
import {
  DEV_CATALOG_PUBLIC_KEYS,
  getCatalogPublicKeys,
  PRODUCTION_CATALOG_PUBLIC_KEYS,
} from './catalog_public_keys';

describe('catalog public keys', () => {
  it('keeps the production list free of dev keys', () => {
    for (const devKey of DEV_CATALOG_PUBLIC_KEYS) {
      expect(PRODUCTION_CATALOG_PUBLIC_KEYS).not.toContain(devKey);
    }
  });

  it('includes dev keys only in dev mode', () => {
    expect(getCatalogPublicKeys(true)).toEqual(DEV_CATALOG_PUBLIC_KEYS);
    expect(getCatalogPublicKeys(false)).toEqual(PRODUCTION_CATALOG_PUBLIC_KEYS);
  });

  it('parses every entry as an ed25519 public key', () => {
    const keys = [...PRODUCTION_CATALOG_PUBLIC_KEYS, ...DEV_CATALOG_PUBLIC_KEYS];
    expect(keys.length).toBeGreaterThan(0);
    for (const pem of keys) {
      expect(createPublicKey(pem).asymmetricKeyType).toBe('ed25519');
    }
  });
});
