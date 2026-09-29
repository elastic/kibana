/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicKey, generateKeyPairSync } from 'crypto';
import { CATALOG_PUBLIC_KEYS } from './catalog_public_keys';
import { signCatalogForTests, verifyCatalogSignature } from '../signature';
import { LIVE_CATALOG_MANIFEST, LIVE_CATALOG_SIGNATURE } from '../test_fixtures';

describe('CATALOG_PUBLIC_KEYS', () => {
  it('ships two distinct valid Ed25519 SPKI PEMs', () => {
    expect(CATALOG_PUBLIC_KEYS).toHaveLength(2);
    const keyTypes = CATALOG_PUBLIC_KEYS.map((pem) => createPublicKey(pem).asymmetricKeyType);
    expect(keyTypes).toEqual(['ed25519', 'ed25519']);
    expect(CATALOG_PUBLIC_KEYS[0]).not.toEqual(CATALOG_PUBLIC_KEYS[1]);
  });

  it('accepts the live fixture signed with the dev key against the full list', () => {
    expect(
      verifyCatalogSignature(LIVE_CATALOG_MANIFEST, LIVE_CATALOG_SIGNATURE, CATALOG_PUBLIC_KEYS)
    ).toBe(true);
  });

  it('rejects a signature from an unknown key against the full list', () => {
    const { privateKey } = generateKeyPairSync('ed25519');
    const signature = signCatalogForTests(
      LIVE_CATALOG_MANIFEST,
      privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    );
    expect(verifyCatalogSignature(LIVE_CATALOG_MANIFEST, signature, CATALOG_PUBLIC_KEYS)).toBe(
      false
    );
  });
});
