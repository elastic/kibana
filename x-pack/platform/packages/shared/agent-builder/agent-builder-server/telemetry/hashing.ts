/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';

const HASH_HEX_LENGTH = 16;

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Returns the first 16 hex characters of the SHA-256 hash of the given value.
 *
 * Used to normalize identifiers for privacy-preserving telemetry and EIS session ids:
 * the result is stable (same input → same output) and opaque (third parties cannot
 * recover the original value without enumerating the input space).
 */
export function toHashedId(value: string): string {
  return sha256Hex(value).slice(0, HASH_HEX_LENGTH);
}
