/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'crypto';

/** Default number of hex characters from the HMAC hash to include in the token. */
const DEFAULT_HASH_LENGTH = 32;

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
 * @param secret - Per-space secret material for HMAC
 * @param entityClass - Token prefix/class label (e.g., `HOST_NAME`, `USER_NAME`)
 * @param field - The field name being anonymized (e.g., `host.name`)
 * @param value - The original field value to anonymize
 * @param hashLength - Number of hex chars to include (default: 32)
 * @returns A deterministic token string (e.g., `HOST_NAME_ae687f...`)
 */
export const generateToken = (
  secret: string,
  entityClass: string,
  field: string,
  value: string,
  hashLength: number = DEFAULT_HASH_LENGTH
): string => {
  const normalizedValue = value.trim();
  const hmacInput = `${entityClass}:${field}:${normalizedValue}`;
  const hash = createHmac('sha256', secret).update(hmacInput).digest('hex');
  const truncatedHash = hash.substring(0, hashLength);

  return `${entityClass}_${truncatedHash}`;
};
