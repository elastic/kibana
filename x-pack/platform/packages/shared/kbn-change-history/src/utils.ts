/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'node:crypto';
import { flattenObject as flatten, unflattenObject as unflatten } from '@kbn/object-utils';
import type {
  ChangeHistoryFieldsToHash,
  ChangeHistoryDiff,
  ChangeHistoryDiffOptions,
} from './types';

export const sha256 = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

/**
 * Returns a filtered diff of two JSON-equivalent objects (enumerable properties, no cyclical structures)
 * The output contains a structure that helps navigate between a JSON object and its previous structure.
 *
 * @param opts - The arguments for the diff calculation.
 * @param opts.a - The first JSON object.
 * @param opts.b - The second JSON object.
 * @param opts.fieldsToIgnore - The fields to ignore in the diff calculation.
 * @returns a [Diff] that helps convert one object into the other.
 * @example
 *   const a = { user: { email: 'bob@example.com' }, status: 'active' };
 *   const b = { user: { email: 'bobby@example.com' }, status: 'inactive' };
 *   const fieldsToIgnore = { status: true };
 *   const result = defaultDiffCalculation({ a, b, fieldsToIgnore });
 *   console.log(result);
 *   // {
 *   //  stats: { total: 1, additions: 0, deletions: 0, updates: 1 },
 *   //  ignored: ['status'],
 *   //  fields: ['user.email'],
 *   //  before: { user: { email: 'bob@example.com' } },
 *   //  after: { user: { email: 'bobby@example.com' } }
 *   // }
 */
export function defaultDiffCalculation(opts: ChangeHistoryDiffOptions): ChangeHistoryDiff {
  const result: ChangeHistoryDiff = {
    stats: {
      total: 0,
      additions: 0,
      deletions: 0,
      updates: 0,
    },
    type: 'default',
    fields: [],
    ignored: [],
    before: {},
    after: {},
  };

  // Flatten both objects and work out diff
  const { a, b, fieldsToIgnore } = opts;
  const stats = result.stats;
  const flatA = flatten(a ?? {});
  const flatB = flatten(b ?? {});
  const allKeys = new Set([...Object.keys(flatA), ...Object.keys(flatB)]);
  const flatFilter = (fieldsToIgnore && flatten(fieldsToIgnore)) || undefined;
  // TODO: Might need better array comparison here though this works for now
  const arrayDeepEquals = (a1: any[] | ArrayBufferView, a2: any[] | ArrayBufferView) =>
    JSON.stringify(a1) === JSON.stringify(a2);
  // ElasticSearch source objects are JSON-equivalent data.
  // Object nesting is taken care of during flattening.
  // We need to take care of Arrays, TypedArrays and primitives
  // and ignore things deliberately excluded by JSON like functions and bigint
  const normalize = (v: any) => {
    switch (typeof v) {
      // eslint-disable-next-line prettier/prettier
      case 'number': case 'string': case 'boolean': return v;
      // eslint-disable-next-line prettier/prettier
      case 'object': return v; // -> Arrays, TypedArrays, Date, null
      // eslint-disable-next-line prettier/prettier
      case 'function': case 'symbol': case 'undefined': return undefined;
      // eslint-disable-next-line prettier/prettier
      case 'bigint': default: throw new TypeError('Please use JSON-compatible types');
    }
  };
  // We ignore fields when the key (or an ancestor) is in fieldsToIgnore with a truthy value.
  // I.e. fieldsToIgnore = { type: true, status: true } ignores type and status from the diff.
  const ignore = (key: string) =>
    !!flatFilter &&
    // TODO: should be tested for performance with a set of v large objects and a lot of ignored fields
    Object.entries(flatFilter).some(([k, v]) => !!v && (key === k || key.startsWith(k + '.')));
  for (const key of allKeys) {
    if (ignore(key)) result.ignored.push(key);
    else {
      const valA = normalize(flatA[key]);
      const valB = normalize(flatB[key]);

      if (Array.isArray(valB) || ArrayBuffer.isView(valB)) {
        if (!arrayDeepEquals(valA, valB)) {
          if (valA === undefined) stats.additions++;
          else stats.updates++;
          result.before[key] = valA;
          result.after[key] = valB;
        } else {
          // Array has not changed
          // So we're good.
        }
      } else if (valA !== valB) {
        // Remaining types are primitives, Date and `null`
        // all of which can be compared directly (as in valA === valB)
        if (valA === undefined) stats.additions++;
        else if (valB === undefined) stats.deletions++;
        else stats.updates++;
        result.before[key] = valA;
        result.after[key] = valB;
      }
    }
  }

  // Gather stats, list of changed fields and return.
  result.stats.total = stats.additions + stats.deletions + stats.updates;
  result.fields = Object.keys(result.after); // <-- We do not need both. Keys are available for `undefined` items.
  result.after = unflatten(result.after);
  result.before = unflatten(result.before);
  return result;
}

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
