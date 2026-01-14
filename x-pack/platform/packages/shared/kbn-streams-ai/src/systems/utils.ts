/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Checks if a filter is valid (not empty).
 * Returns false for: null, undefined, {}, { and: [] }, { or: [] }
 */
export function isValidFilter(filter: unknown): boolean {
  if (filter == null || typeof filter !== 'object') {
    return false;
  }

  const keys = Object.keys(filter);

  if (keys.length === 0) {
    return false;
  }

  if (keys.length === 1) {
    if ('and' in filter && Array.isArray(filter.and) && filter.and.length === 0) {
      return false;
    }
    if ('or' in filter && Array.isArray(filter.or) && filter.or.length === 0) {
      return false;
    }
  }

  return true;
}
