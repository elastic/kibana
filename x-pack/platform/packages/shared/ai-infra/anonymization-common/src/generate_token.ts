/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'crypto';

/** Default number of hex characters from the HMAC hash to include in the token. */
const DEFAULT_HASH_LENGTH = 32;

/** SHA-256 produces 64 hex characters. */
const MAX_HASH_LENGTH = 64;

/**
 * Generates a deterministic anonymization token for a field value.
 *
 * The token format is `<ENTITY_CLASS>_<HASH>` where the hash is derived from
 * a per-space secret using HMAC-SHA256.
 *
 * The same (secret, entityClass, field, value) tuple always produces the same
 * token, ensuring stability within a space. Different spaces use different
 * secrets, preventing cross-space token correlation.
 *
 * @param secret - Per-space secret material for HMAC (must be non-empty)
 * @param entityClass - Token prefix/class label (e.g., `HOST_NAME`, `USER_NAME`)
 * @param field - The field name being anonymized (e.g., `host.name`)
 * @param value - The original field value to anonymize
 * @param hashLength - Number of hex chars to include (default: 32, clamped to 1–64)
 * @returns A deterministic token string (e.g., `HOST_NAME_ae687f...`)
 */
export const generateToken = (
  secret: string,
  entityClass: string,
  field: string,
  value: string,
  hashLength: number = DEFAULT_HASH_LENGTH
): string => {
  if (!secret) {
    throw new Error('Secret must be non-empty for token generation');
  }

  const safeHashLength =
    Number.isFinite(hashLength) && hashLength > 0
      ? Math.min(Math.floor(hashLength), MAX_HASH_LENGTH)
      : DEFAULT_HASH_LENGTH;

  // Length-prefixed format prevents delimiter collisions when components
  // contain the separator character (e.g. entityClass="A:B" vs field="A:B").
  const hmacInput = `${entityClass.length}:${entityClass}:${field.length}:${field}:${value}`;
  const hash = createHmac('sha256', secret).update(hmacInput).digest('hex');
  const truncatedHash = hash.substring(0, safeHashLength);

  return `${entityClass}_${truncatedHash}`;
};
