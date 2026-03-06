/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'node:crypto';
import flatten, { unflatten } from 'flat';
import type {
  ChangeTrackingDataMaskingFields,
  ChangeTrackingDiff,
  ChangeTrackingDiffOptions,
} from './types';

export const sha256 = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

/**
 * Returns a filtered diff of two JSON-equivalent objects (enumerable properties, no cyclical structures)
 * The output contains a structure that helps navigate between a JSON object and its previous structure.
 *
 * @param opts - The arguments for the diff calculation.
 * @param opts.a - The first JSON object.
 * @param opts.b - The second JSON object.
 * @param opts.ignoreFields - The fields to ignore in the diff calculation.
 * @returns a [Diff] that helps convert one object into the other.
 * @example
 *   const a = { user: { email: 'bob@example.com' }, status: 'active' };
 *   const b = { user: { email: 'bobby@example.com' }, status: 'inactive' };
 *   const ignoreFields = { status: true };
 *   const result = standardDiffDocCalculation({ a, b, ignoreFields });
 *   // {
 *   //  stats: { total: 1, additions: 0, deletions: 0, updates: 1 },
 *   //  ignored: ['status'],
 *   //  fieldChanges: ['user.email'],
 *   //  oldvalues: { user: { email: 'bob@example.com' } },
 *   //  newvalues: { user: { email: 'bobby@example.com' } }
 *   // }
 */
export function standardDiffDocCalculation(opts: ChangeTrackingDiffOptions): ChangeTrackingDiff {
  const result: ChangeTrackingDiff = {
    stats: {
      total: 0,
      additions: 0,
      deletions: 0,
      updates: 0,
    },
    ignored: [],
    fieldChanges: [],
    oldvalues: {},
    newvalues: {},
  };

  // Flatten both objects and work out diff
  const { a, b, ignoreFields } = opts;
  const stats = result.stats;
  const options = { safe: true };
  const flatA = flatten(a ?? {}, options) as Record<string, any>;
  const flatB = flatten(b ?? {}, options) as Record<string, any>;
  const allKeys = new Set([...Object.keys(flatA), ...Object.keys(flatB)]);
  const flatFilter =
    (ignoreFields && (flatten(ignoreFields, options) as Record<string, any>)) || undefined;
  // TODO: Might need better array comparison here though this works for now
  const arrayDeepEquals = (a1: any[] | ArrayBufferView, a2: any[] | ArrayBufferView) =>
    JSON.stringify(a1) === JSON.stringify(a2);
  // ElasticSearch source objects are JSON-equivalent data.
  // Object nesting is taken care of during flattening.
  // We need to take care of Arrays, TypedArrays and primitives
  // and ignore things deliberately excluded by JSON like functions and bigint
  const check = (v: any) => {
    switch (typeof v) {
      // eslint-disable-next-line prettier/prettier
      case 'number': case 'string': case 'boolean': return v;
      // eslint-disable-next-line prettier/prettier
      case 'object': return v; // -> Arrays, TypedArrays, Date
      // eslint-disable-next-line prettier/prettier
      case 'function': case 'symbol': case 'undefined': return undefined;
      // eslint-disable-next-line prettier/prettier
      case 'bigint': default: throw new TypeError('Please use JSON-compatible types');
    }
  };
  // We ignore fields when the key (or an ancestor) is in ignoreFields with a truthy value.
  // I.e. ignoreFields = { type: true, status: true } ignores type and status from the diff.
  const ignore = (key: string) =>
    !!flatFilter &&
    Object.entries(flatFilter).some(([k, v]) => !!v && (key === k || key.startsWith(k + '.')));
  for (const key of allKeys) {
    if (ignore(key)) result.ignored.push(key);
    else {
      const valA = check(flatA[key]);
      const valB = check(flatB[key]);

      if (Array.isArray(valB) || ArrayBuffer.isView(valB)) {
        if (!arrayDeepEquals(valA, valB)) {
          if (valA === undefined) stats.additions++;
          else stats.updates++;
          result.oldvalues[key] = valA;
          result.newvalues[key] = valB;
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
        result.oldvalues[key] = valA;
        result.newvalues[key] = valB;
      }
    }
  }

  // Gather stats, list of changed fields and return.
  result.stats.total = stats.additions + stats.deletions + stats.updates;
  result.fieldChanges = Object.keys(result.newvalues);
  return result;
}

/**
 * Masks sensitive data in a snapshot of an object.
 * @param snapshot - The snapshot of the object to mask sensitive data from.
 * @param maskFields - The fields to mask in the snapshot.
 * @returns The masked keys and the snapshot with the masked fields.
 * @example
 *   const snapshot = { user: { email: 'bob@example.com' } };
 *   const maskFields = { user: true };
 *   const result = maskSensitiveFields(snapshot, maskFields);
 *   // {
 *   //  maskedKeys: ['user.email'],
 *   //  snapshot: { user: { email: '****************1af4e7be90' } }
 *   // }
 */
export function maskSensitiveFields(
  snapshot: Record<string, any>,
  maskFields?: ChangeTrackingDataMaskingFields
): { masked: Array<string>; snapshot: Record<string, any> } {
  const masked: string[] = [];
  if (!maskFields) {
    return { masked, snapshot };
  }
  const flatSnapshot = flatten(snapshot, { safe: true }) as Record<string, any>;
  const flatMaskings = flatten(maskFields, { safe: true }) as Record<string, boolean>;
  const isMasked = (key: string) =>
    Object.entries(flatMaskings).some(([k, v]) => !!v && (key === k || key.startsWith(k + '.')));

  for (const key of Object.keys(flatSnapshot)) {
    const value = flatSnapshot[key];
    if (isMasked(key) && typeof value === 'string') {
      masked.push(key);
      flatSnapshot[key] = `****************${sha256(value).slice(-12)}`;
    }
  }

  return {
    masked,
    snapshot: unflatten(flatSnapshot),
  };
}
