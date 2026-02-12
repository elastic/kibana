/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import flatten from 'flat';
import type { ChangeTrackingDiff, ChangeTrackingDiffOptions } from './types';

/**
 * Returns a filtered diff of two JSON-equivalent objects
 * The diff contains a structure that helps convert one JSON object into the other.
 *
 * @param opts - The arguments for the diff calculation.
 * @param opts.a - The first JSON object.
 * @param opts.b - The second JSON object.
 * @param opts.excludeFields - The fields to exclude from the diff calculation.
 * @returns a [Diff] that helps convert one object into the other.
 */
export function standardDiffDocCalculation(opts: ChangeTrackingDiffOptions): ChangeTrackingDiff {
  const result: ChangeTrackingDiff = {
    stats: {
      total: 0,
      additions: 0,
      deletions: 0,
      updates: 0,
    },
    fieldChanges: [],
    oldvalues: {},
    newvalues: {},
  };

  // Flatten both objects and work out diff
  const { a, b, excludeFields } = opts;
  const stats = result.stats;
  const options = { safe: true };
  const flatA = flatten(a ?? {}, options) as Record<string, any>;
  const flatB = flatten(b ?? {}, options) as Record<string, any>;
  const allKeys = new Set([...Object.keys(flatA), ...Object.keys(flatB)]);
  const flatFilter =
    (excludeFields && (flatten(excludeFields, options) as Record<string, any>)) || undefined;
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
  // We exclude keys when:
  // - the filter is missing OR
  // - the key (or its parent/ancestor) is explicitly excluded
  const exclude = (key: string) =>
    // TODO: Review this. If excluding parent property we should also exclude its children
    flatFilter && Object.entries(flatFilter).some(([k, v]) => key === k && !v);
  for (const key of allKeys) {
    if (!exclude(key)) {
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
