/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createCipheriv,
  createHmac,
  getFips,
  hkdfSync,
  randomBytes as cryptoRandomBytes,
} from 'crypto';
import type { Logger } from '@kbn/logging';
import type { StreamsUnit } from '@kbn/streams-schema';
import { StatusError } from '../streams/errors/status_error';
import type { EncryptionKeyStore } from './encryption_key_store';
import type { EncryptUnitCredentials, UnitCredential } from './types';

const CIPHER = 'aes-256-gcm';
const NONCE_BYTES = 12;
const FINGERPRINT_KEY_INFO = 'streams-config-fingerprint';
const FINGERPRINT_KEY_BYTES = 32;

/** Seals unit secrets with the current wrap key for the distributor `credentials[]` sidecar. */
export const createCredentialSealer = ({
  store,
  logger,
  randomBytes = cryptoRandomBytes,
}: {
  store: EncryptionKeyStore;
  logger: Logger;
  randomBytes?: (size: number) => Buffer;
}): EncryptUnitCredentials => {
  if (!getFips()) {
    logger.warn(
      'Sealing Streams unit credentials without the OpenSSL FIPS provider. Serverless requires FIPS 140-3.'
    );
  }

  return async (secrets) => {
    // JSON allows escaped lone surrogates, and UTF-8 encoding would silently turn them into U+FFFD.
    if (
      Object.entries(secrets).some(([name, value]) => !name.isWellFormed() || !value.isWellFormed())
    ) {
      throw new StatusError(
        'Streams unit secret names and values must be well-formed Unicode',
        400
      );
    }

    // One key read per publish, so a rotation cannot split one unit across two kids.
    const { kid, key } = await store.readCurrent();

    try {
      const names = Object.keys(secrets).sort();

      return {
        credentials: names.map((name) =>
          sealCredential({ name, value: secrets[name], key, nonce: randomBytes(NONCE_BYTES) })
        ),
        fingerprint: fingerprintSecrets({ key, kid, names, secrets }),
      };
    } finally {
      key.fill(0);
    }
  };
};

/** AAD agreed with the collector unwrap (ingest-dev#9550). None today. */
const additionalData = (): Buffer | undefined => undefined;

const sealCredential = ({
  name,
  value,
  key,
  nonce,
}: {
  name: string;
  value: string;
  key: Buffer;
  nonce: Buffer;
}): UnitCredential => {
  const cipher = createCipheriv(CIPHER, key, nonce);
  const aad = additionalData();
  if (aad) {
    cipher.setAAD(aad);
  }

  // Go's AEAD.Open expects the tag appended to the ciphertext.
  const blob = Buffer.concat([
    nonce,
    cipher.update(value, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  return { name, ciphertext: blob.toString('base64') };
};

const fingerprintSecrets = ({
  key,
  kid,
  names,
  secrets,
}: {
  key: Buffer;
  kid: string;
  names: string[];
  secrets: StreamsUnit.Secrets;
}): string => {
  // A derived key keeps the HMAC from reusing the GCM key directly.
  const fingerprintKey = Buffer.from(
    hkdfSync('sha256', key, '', FINGERPRINT_KEY_INFO, FINGERPRINT_KEY_BYTES)
  );

  try {
    const hmac = createHmac('sha256', fingerprintKey).update(kid);
    for (const name of names) {
      const value = secrets[name];
      // Length prefixes stop different name/value splits from colliding.
      hmac.update(`\n${Buffer.byteLength(name)}:${name}=${Buffer.byteLength(value)}:`);
      hmac.update(value, 'utf8');
    }
    return hmac.digest('hex');
  } finally {
    fingerprintKey.fill(0);
  }
};
