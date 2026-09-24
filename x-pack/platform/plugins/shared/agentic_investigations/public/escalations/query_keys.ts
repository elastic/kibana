/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const escalationQueryKeys = {
  all: ['agenticInvestigations', 'escalations'] as const,
  /**
   * Include all response-shaping inputs so React Query re-fetches when any of
   * them changes. Omitting page or perPage would cause a page flip to return
   * stale data from the previous page's cache entry.
   */
  list: (status?: string, page?: number, perPage?: number, search?: string) =>
    [
      ...escalationQueryKeys.all,
      'list',
      status ?? 'open',
      page ?? 1,
      perPage ?? null,
      search ?? '',
    ] as const,
};
