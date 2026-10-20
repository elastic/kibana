/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCipheriv, getFips, randomBytes as cryptoRandomBytes, timingSafeEqual } from 'crypto';
import type { Logger } from '@kbn/logging';
import { StatusError } from '../streams/errors/status_error';
import type { EncryptionKeyStore } from './encryption_key_store';
import type { ResolveTargetId } from './distributor_target_id';
import type { PrepareUnitCredentials, StoredUnitCredential } from './types';

const CIPHER = 'aes-256-gcm';
const NONCE_BYTES = 12;

/**
 * Seals unit secrets once per save with the current wrap key, bound to the distributor target.
 * A stored blob is reused while its kid, target and plaintext are unchanged.
 */
export const createCredentialPreparer = ({
  store,
  resolveTargetId,
  logger,
  randomBytes = cryptoRandomBytes,
}: {
  store: EncryptionKeyStore;
  resolveTargetId: ResolveTargetId;
  logger: Logger;
  randomBytes?: (size: number) => Buffer;
}): PrepareUnitCredentials => {
  if (!getFips()) {
    logger.warn(
      'Sealing Streams unit credentials without the OpenSSL FIPS provider. Serverless requires FIPS 140-3.'
    );
  }

  return async ({ secrets, previous }) => {
    // JSON allows escaped lone surrogates, and UTF-8 encoding would silently turn them into U+FFFD.
    if (
      Object.entries(secrets).some(([name, value]) => !name.isWellFormed() || !value.isWellFormed())
    ) {
      throw new StatusError(
        'Streams unit secret names and values must be well-formed Unicode',
        400
      );
    }

    const names = Object.keys(secrets).sort();
    if (names.length === 0) {
      return { credentials: [], sealed: [] };
    }

    // One target and one kid per save, so a rotation cannot split one unit across two kids.
    const targetId = resolveTargetId();
    const kid = await store.readCurrentKid();
    const stored = new Map(previous.sealed.map((entry) => [entry.name, entry]));

    const reusable = new Map<string, StoredUnitCredential>();
    for (const name of names) {
      const entry = stored.get(name);
      if (
        entry !== undefined &&
        entry.target === targetId &&
        parseSealedBlob(entry.ciphertext)?.kid === kid &&
        Object.hasOwn(previous.secrets, name) &&
        isSameSecret(previous.secrets[name], secrets[name])
      ) {
        reusable.set(name, entry);
      }
    }

    // The key file is read only when something has to be sealed.
    let key: Buffer | undefined;
    try {
      const sealed: StoredUnitCredential[] = [];
      for (const name of names) {
        const reused = reusable.get(name);
        if (reused) {
          sealed.push(reused);
          continue;
        }
        key ??= await store.readKey(kid);
        sealed.push({
          name,
          target: targetId,
          ciphertext: sealValue({
            value: secrets[name],
            key,
            kid,
            targetId,
            nonce: randomBytes(NONCE_BYTES),
          }),
        });
      }

      return { credentials: sealed.map(({ name, ciphertext }) => ({ name, ciphertext })), sealed };
    } finally {
      key?.fill(0);
    }
  };
};

// The request value is caller-controlled and the stored value is the secret, so compare in constant time.
const isSameSecret = (stored: string, incoming: string): boolean => {
  const storedBytes = Buffer.from(stored, 'utf8');
  const incomingBytes = Buffer.from(incoming, 'utf8');
  return storedBytes.length === incomingBytes.length && timingSafeEqual(storedBytes, incomingBytes);
};

const BLOB_VERSION = 'v1';

/** `v1.<kid>.<iv>.<ct>`: 16 chars is a 12-byte IV, 22 chars is the 16-byte tag with an empty plaintext. */
const SEALED_BLOB_PATTERN =
  /^v1\.([A-Za-z0-9_-]{1,64})\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{22,})$/;
const TAG_BYTES = 16;

// Node decodes base64url leniently, Go does not. A segment must re-encode to itself.
const decodeCanonicalBase64Url = (segment: string): Buffer | undefined => {
  const decoded = Buffer.from(segment, 'base64url');
  return decoded.toString('base64url') === segment ? decoded : undefined;
};

/** Key id of a `v1.<kid>.<iv>.<ct>` blob the distributor can decode, or undefined for anything else. */
export const parseSealedBlob = (blob: string): { kid: string } | undefined => {
  const match = SEALED_BLOB_PATTERN.exec(blob);
  if (!match) {
    return undefined;
  }
  const [, kid, iv, ct] = match;
  const nonce = decodeCanonicalBase64Url(iv);
  const sealed = decodeCanonicalBase64Url(ct);
  if (nonce?.length !== NONCE_BYTES || sealed === undefined || sealed.length < TAG_BYTES) {
    return undefined;
  }
  return { kid };
};

const sealValue = ({
  value,
  key,
  kid,
  targetId,
  nonce,
}: {
  value: string;
  key: Buffer;
  kid: string;
  targetId: string;
  nonce: Buffer;
}): string => {
  const cipher = createCipheriv(CIPHER, key, nonce);
  cipher.setAAD(Buffer.from(targetId, 'utf8'));
  // The contract appends the GCM tag to the ciphertext, as Go's AEAD.Open expects.
  const sealed = Buffer.concat([cipher.update(value, 'utf8'), cipher.final(), cipher.getAuthTag()]);

  return [BLOB_VERSION, kid, nonce.toString('base64url'), sealed.toString('base64url')].join('.');
};
