/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryParams, Template } from './types';

export const PAGE_SIZE_OPTIONS: number[] = [10, 25, 50, 100];

export const DEFAULT_QUERY_PARAMS: QueryParams = {
  page: 1,
  perPage: PAGE_SIZE_OPTIONS[0],
  sortField: 'name',
  sortOrder: 'asc',
  search: '',
};

export const LINE_CLAMP = 3;

export const SOLUTION_LABELS: Record<Template['solution'], string> = {
  security: 'Security',
  observability: 'Observability',
  other: 'Other',
};

export const SOLUTION_ICONS: Record<Template['solution'], string> = {
  security: 'logoSecurity',
  observability: 'logoObservability',
  other: 'logoKibana',
};
