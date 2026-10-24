/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeSearchField } from '../types/episode_data_source';

/** Container types whose values can't be compared for a `field_change` condition. */
const NON_SCALAR_FIELD_TYPES = new Set(['object', 'nested']);

/**
 * Reduces a data source's search fields to the sorted, unique scalar field names
 * offered in the `field_change` snooze condition's dropdown.
 */
export const toConditionFieldNames = (fields: readonly EpisodeSearchField[]): string[] => {
  const names = new Set<string>();

  for (const field of fields) {
    if (!field?.name || NON_SCALAR_FIELD_TYPES.has(field.type)) continue;
    // Leaves of a nested object resolve to `null` when snapshotted by dot path
    // (see #275054), so they can't back a `field_change` condition either.
    if (field.subType?.nested) continue;
    names.add(field.name);
  }

  return [...names].sort((a, b) => a.localeCompare(b));
};
