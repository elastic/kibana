/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActiveFilters } from '@kbn/content-list-provider';

export const matchesIncludeExclude = (
  filters: ActiveFilters,
  fieldName: string,
  value: string
): boolean => {
  const filter = filters[fieldName];
  if (!filter || typeof filter === 'string' || 'state' in filter) {
    return true;
  }
  const { include = [], exclude = [] } = filter;
  return !exclude.includes(value) && (include.length === 0 || include.includes(value));
};

export const matchesSearch = (search: string | undefined, values: string[]): boolean => {
  // The search bar escapes query syntax, such as `-` in `logs\-*`.
  const text = (search ?? '').replace(/\\(.)/g, '$1').trim().toLowerCase();
  return text === '' || values.some((value) => value.toLowerCase().includes(text));
};
