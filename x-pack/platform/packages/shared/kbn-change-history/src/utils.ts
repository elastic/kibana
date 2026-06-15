/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'node:crypto';
import { flattenObject as flatten, unflattenObject as unflatten } from '@kbn/object-utils';
import type { ChangeHistoryFieldsToHash } from './types';

export const sha256 = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

export const hmacSha256 = (text: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(text).digest('hex');

export interface ProcessFieldsOpts {
  fieldsToHash?: ChangeHistoryFieldsToHash;
  secret?: string;
}

/**
 * Processes certain key fields in a snapshot of an object (Sensitive data etc)
 * @param snapshot - The snapshot to process (a new updated object is returned when hashing applies).
 * @param opts.fieldsToHash - Nested map of field paths to hash.
 * @param opts.secret - HMAC key. Defaults to '' (plain SHA-256 fallback).
 * @returns The list of flattened paths that were hashed and the snapshot with those string values replaced.
 * @example
 *   const snapshot = { user: { name: 'bob', email: 'bob@example.com' } };
 *   const result = processFields(snapshot, { fieldsToHash: { user: { email: true } }, secret: 'rule-id-123' });
 *   // {
 *   //  fields: ['user.email'],
 *   //  snapshot: { user: { name: 'bob', email: '<hmac-sha256-hex>' } }
 *   // }
 */
export function processFields(
  snapshot: Record<string, any>,
  { fieldsToHash, secret = '' }: ProcessFieldsOpts = {}
): { fields: { hashed: string[] }; snapshot: Record<string, any> } {
  const hashed: string[] = [];
  if (!fieldsToHash || Object.keys(fieldsToHash).length === 0) {
    return { fields: { hashed }, snapshot };
  }
  const flatSnapshot = flatten(snapshot);
  const flatFieldsToHash = flatten(fieldsToHash);
  const shouldBeHashed = (key: string) =>
    Object.entries(flatFieldsToHash).some(
      ([k, v]) => !!v && (key === k || key.startsWith(k + '.'))
    );
  const hash = (value: string) => hmacSha256(value, secret);

  for (const key of Object.keys(flatSnapshot)) {
    const value = flatSnapshot[key];
    // TODO: We might need to expand this for binary blobs.
    if (typeof value === 'string' && shouldBeHashed(key)) {
      hashed.push(key);
      flatSnapshot[key] = hash(value);
    }
  }

  return {
    fields: { hashed },
    snapshot: unflatten(flatSnapshot),
  };
}
