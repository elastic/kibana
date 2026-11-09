/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { isPlainObject } from 'lodash';
import type { StateComparators } from '@kbn/presentation-publishing';
import type { LensWireAPIConfig } from '@kbn/lens-common-2';

/**
 * Drops object keys holding `undefined`, which are lost once state is persisted as JSON.
 */
export const omitUndefinedKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(omitUndefinedKeys);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, omitUndefinedKeys(entryValue)])
    );
  }
  return value;
};

const areValuesEqual = (a: unknown, b: unknown) =>
  deepEqual(omitUndefinedKeys(a), omitUndefinedKeys(b));

/**
 * Comparators for the Lens panel config (by-reference, nested by-value, or flattened by-value).
 * Runtime-only state (query, filters, search session, etc.) is not part of this config and is not compared.
 *
 * Shared by public and server so both sides decide equality the same way.
 */
export function getComparators(lensState: LensWireAPIConfig): StateComparators<LensWireAPIConfig> {
  const comparators: Record<string, 'deepEquality' | ((a: unknown, b: unknown) => boolean)> = {
    title: 'deepEquality',
    description: 'deepEquality',
    hide_title: (a, b) => Boolean(a) === Boolean(b),
    hide_border: (a, b) => Boolean(a) === Boolean(b),
    time_range: 'deepEquality',
    drilldowns: (a, b) => deepEqual(a ?? [], b ?? []),
    ref_id: 'deepEquality',
    attributes: areValuesEqual,
  };

  // Flattened by-value configs keep chart fields at the root, compare any remaining key structurally
  Object.keys(lensState).forEach((key) => {
    if (!(key in comparators)) comparators[key] = areValuesEqual;
  });

  return comparators as unknown as StateComparators<LensWireAPIConfig>;
}
