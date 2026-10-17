/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createHash } from 'crypto';

export const HASH_ALG = 'sha256' as const;

export function hashEuid(id: string): string {
  return createHash(HASH_ALG).update(id).digest('hex');
}
