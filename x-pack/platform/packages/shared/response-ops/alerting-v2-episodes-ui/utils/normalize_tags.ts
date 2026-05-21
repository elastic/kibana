/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ES|QL `LAST(tags, …)` on the alert-actions `tags` field may return a
 * string, a multivalue array, or null. Normalize to a string array for UI.
 */
export const normalizeTags = (value: string | string[] | null | undefined): string[] => {
  if (value == null) {
    return [];
  }
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [];
};
