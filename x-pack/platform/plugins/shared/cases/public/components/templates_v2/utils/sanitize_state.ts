/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PAGE_SIZE_OPTIONS, SORT_ORDER_VALUES, DEFAULT_QUERY_PARAMS } from '../constants';
import type { QueryParams } from '../types';

export const sanitizeState = (state: Partial<QueryParams> = {}): Partial<QueryParams> => {
  const { perPage, sortOrder, tags, createdBy, ...rest } = state;

  const sanitized: Partial<QueryParams> = { ...rest };

  if (perPage !== undefined) {
    sanitized.perPage = Math.min(perPage, PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1]);
  }

  if (sortOrder !== undefined) {
    sanitized.sortOrder = SORT_ORDER_VALUES.includes(sortOrder)
      ? sortOrder
      : DEFAULT_QUERY_PARAMS.sortOrder;
  }

  // Ensure tags is an array of strings
  if (tags !== undefined) {
    sanitized.tags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  }

  // Ensure createdBy is an array of strings
  if (createdBy !== undefined) {
    sanitized.createdBy = Array.isArray(createdBy) ? createdBy.filter(Boolean) : [];
  }

  return sanitized;
};
