/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unflattenObject } from '@kbn/object-utils';
import type { Group } from './types';

export const unflattenGrouping = (
  grouping?: Record<string, string> | undefined
): Record<string, any> | undefined => {
  if (grouping) {
    return unflattenObject(grouping);
  }
};

export const getFormattedGroups = (grouping?: Record<string, unknown>): Group[] | undefined => {
  const groups: Group[] = [];
  if (grouping) {
    const groupKeys = Object.keys(grouping);
    groupKeys.forEach((group) => {
      groups.push({ field: group, value: String(grouping[group]) });
    });
  }
  return groups.length ? groups : undefined;
};

/**
 * Flattens a bucket key returned by Elasticsearch aggregations into an object whose
 * keys correspond to the rule's `groupBy` fields and whose values come from the
 * aggregation `bucketKey`.
 *
 * The contract is:
 *  - `groupBy`            → the same field(s) that were sent in the alert rule params.
 *  - `bucketKey`          → an object whose **first property** relates to the first
 *                           `groupBy` field, the **second property** to the second
 *                           `groupBy`, and so on. The property names coming from
 *                           Elasticsearch (e.g. `key0`, `key1`, …) are irrelevant –
 *                           only their insertion order matters.
 *
 * Example 1 – single group-by:
 *   groupBy   = 'host.hostname'
 *   bucketKey = { key0: 'web-01' }
 *   returns   = { 'host.hostname': 'web-01' }
 *
 * Example 2 – multiple group-bys:
 *   groupBy   = ['host.hostname', 'host.architecture']
 *   bucketKey = { key0: 'web-01', key1: 'amd64' }
 *   returns   = {
 *     'host.hostname':      'web-01',
 *     'host.architecture':  'amd64',
 *   }
 *
 * NOTE: `bucketKey` **must** contain at least the same number of values as there
 * are `groupBy` entries; extra properties will be ignored and missing properties
 * will result in `undefined` values in the flattened object.
 */
export const getFlattenGrouping = ({
  groupBy,
  bucketKey,
}: {
  groupBy: string | string[] | undefined;
  bucketKey: Record<string, string>;
}) => {
  if (!groupBy) return;
  const internalGroupBy = typeof groupBy === 'string' ? [groupBy] : groupBy;
  const keyValues = Object.values(bucketKey);

  return Object.fromEntries(internalGroupBy.map((k, index) => [k, keyValues[index]]));
};
