/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'crypto';

const DEFAULT_HASH_LENGTH = 32;

/**
 * Matches tokens produced by generateToken: `<ENTITY_CLASS>_<32 hex chars>`.
 * Exported so all consumers share a single definition tied to DEFAULT_HASH_LENGTH.
 */
export const TOKEN_RESTORE_REGEX = /\b([A-Z][A-Z0-9_]*)_([0-9a-f]{32})\b/g;

/**
 * Generate a deterministic anonymization token.
 * Format: `${entityClass}_${hex32}` — the hex suffix is an HMAC-SHA256 of
 * `${entityClass.length}:${entityClass}::${value}` keyed by `salt`.
 * The same (salt, entityClass, value) triple always produces the same token,
 * enabling consistent multi-turn replacement within a session.
 */
export const generateToken = (salt: string, entityClass: string, value: string): string => {
  const hmacInput = `${entityClass.length}:${entityClass}::${value}`;
  const hash = createHmac('sha256', salt).update(hmacInput).digest('hex');
  return `${entityClass}_${hash.substring(0, DEFAULT_HASH_LENGTH)}`;
};
