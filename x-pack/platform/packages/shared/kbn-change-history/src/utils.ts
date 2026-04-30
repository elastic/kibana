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

/**
 * Hashes certain key fields in a snapshot of an object (Sensitive data etc)
 * @param snapshot - The snapshot to process (a new updated object is returned when hashing applies).
 * @param fieldsToHash - Nested map of field paths to hash.
 * @returns The list of flattened paths that were hashed and the snapshot with those string values replaced.
 * @example
 *   const snapshot = { user: { name: 'bob', email: 'bob@example.com' } };
 *   const pathsToHash = { user: { email: true } };
 *   const result = hashFields(snapshot, pathsToHash);
 *   // {
 *   //  fields: ['user.email'],
 *   //  snapshot: { user: { name: 'bob', email: '5ff860bf1190596c7188ab851db691f0f3169c453936e9e1eba2f9a47f7a0018' } }
 *   // }
 */
export function hashFields(
  snapshot: Record<string, any>,
  fieldsToHash?: ChangeHistoryFieldsToHash
): { fields: Array<string>; snapshot: Record<string, any> } {
  const fields: string[] = [];
  if (!fieldsToHash || Object.keys(fieldsToHash).length === 0) {
    return { fields, snapshot };
  }
  const flatSnapshot = flatten(snapshot);
  const flatFieldsToHash = flatten(fieldsToHash);
  const shouldBeHashed = (key: string) =>
    Object.entries(flatFieldsToHash).some(
      ([k, v]) => !!v && (key === k || key.startsWith(k + '.'))
    );

  for (const key of Object.keys(flatSnapshot)) {
    const value = flatSnapshot[key];
    // TODO: We might need to expand this for binary blobs.
    if (typeof value === 'string' && shouldBeHashed(key)) {
      fields.push(key);
      flatSnapshot[key] = sha256(value);
    }
  }

  return {
    fields,
    snapshot: unflatten(flatSnapshot),
  };
}
