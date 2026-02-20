/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplatesFindRequest } from '../../../common/types/api/template/v1';

export const PAGE_SIZE_OPTIONS: number[] = [10, 25, 50, 100];

export const TEMPLATES_STATE_URL_KEY = 'templates';

export const SORT_ORDER_VALUES: Array<'asc' | 'desc'> = ['asc', 'desc'];

export const DEFAULT_QUERY_PARAMS: TemplatesFindRequest = {
  page: 1,
  perPage: PAGE_SIZE_OPTIONS[0],
  sortField: 'name',
  sortOrder: 'asc',
  search: '',
  tags: [],
  author: [],
  isDeleted: false,
};

export const LINE_CLAMP = 3;
