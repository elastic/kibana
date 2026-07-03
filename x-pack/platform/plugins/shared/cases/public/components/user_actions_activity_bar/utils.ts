/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActivityParams } from './types';

/**
 * Whether any of the user activity filters (type, author, search) are
 * currently applied. Derived from `params` (the applied/committed state)
 * rather than any in-progress UI input, so it stays consistent with what's
 * actually driving the rendered results.
 */
export const hasActiveUserActivityFilter = (params: UserActivityParams): boolean =>
  Boolean(params.type !== 'all' || params.authors?.length || params.search);

/**
 * Whether `search` and/or `authors` are applied. Unlike
 * {@link hasActiveUserActivityFilter}, this deliberately excludes `type`:
 * it's used by the pagination hooks (`useLastPage` /
 * `useInfiniteFindCaseUserActions`) to decide whether `userActionsStats`
 * (which only reflects `type` totals, not filtered-by-search/author totals)
 * can be trusted to compute a separate last page. Keep both call sites using
 * this helper — they must agree, or the infinite query and the separately
 * fetched "last page" will disagree on where pagination ends.
 */
export const hasSearchOrAuthorFilter = (
  params: Pick<UserActivityParams, 'search' | 'authors'>
): boolean => Boolean(params.search || params.authors?.length);
