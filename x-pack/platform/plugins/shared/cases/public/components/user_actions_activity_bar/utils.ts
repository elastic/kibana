/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActivityParams } from './types';

/**
 * Whether any of the type/author/search filters are applied. Derived from
 * the applied `params`, not in-progress UI input.
 */
export const hasActiveUserActivityFilter = (params: UserActivityParams): boolean =>
  Boolean(params.type !== 'all' || params.authors?.length || params.search);

/**
 * Whether `search` and/or `authors` are applied (deliberately excludes
 * `type`). Used by `useLastPage` and `useInfiniteFindCaseUserActions` to
 * decide if `userActionsStats` (unfiltered totals) can compute a separate
 * last page. Both call sites must agree, or pagination will disagree on
 * where results end.
 */
export const hasSearchOrAuthorFilter = (
  params: Pick<UserActivityParams, 'search' | 'authors'>
): boolean => Boolean(params.search || params.authors?.length);
