/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActionFindRequestSources } from '../../../common/types/api';

export type UserActivityFilter = 'all' | 'user' | 'action';

export type UserActivitySortOrder = 'asc' | 'desc';

export interface UserActivityParams {
  type: UserActivityFilter;
  sortOrder: UserActivitySortOrder;
  page: number;
  perPage: number;
  search?: string;
  authors?: string[];
  sources?: UserActionFindRequestSources[];
}

/** Filters persisted to local storage. Excludes free-text search. */
export interface UserActivityFilters {
  type: UserActivityFilter;
  sortOrder: UserActivitySortOrder;
  authors?: string[];
  sources?: UserActionFindRequestSources[];
}
