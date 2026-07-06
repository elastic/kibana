/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplatesFindRequest } from '../../../../common/types/api/template/v1';
import { PAGE_SIZE_OPTIONS, SORT_ORDER_VALUES, DEFAULT_QUERY_PARAMS } from '../constants';

export const sanitizeState = (
  state: Partial<TemplatesFindRequest> = {}
): Partial<TemplatesFindRequest> => {
  const { perPage, sortOrder, tags, author, ...rest } = state;

  const sanitized: Partial<TemplatesFindRequest> = { ...rest };

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

  // Ensure author is an array of strings
  if (author !== undefined) {
    sanitized.author = Array.isArray(author) ? author.filter(Boolean) : [];
  }

  return sanitized;
};
