/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isPlainObject, isString } from 'lodash';

/** Resolve a dot-path against nested objects or a single top-level key (e.g. flattened `host.name`). */
export const getValueByFieldPath = (data: Record<string, unknown>, field: string): unknown => {
  const nested = get(data, field);

  if (nested !== undefined) {
    return nested;
  }

  return undefined;
};

export const formatGroupingValueForDisplay = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

/** Grouping fields whose formatted value is non-empty (whitespace-only counts as empty). */
export const getNonEmptyGroupingFields = (
  fields: readonly string[],
  data: Record<string, unknown>
): string[] =>
  fields.filter(
    (field) => formatGroupingValueForDisplay(getValueByFieldPath(data, field)).trim() !== ''
  );

export const parseEpisodeDataJson = (raw: unknown): Record<string, unknown> => {
  if (!isString(raw) || raw.length === 0) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (isPlainObject(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore malformed JSON
  }
  return {};
};
