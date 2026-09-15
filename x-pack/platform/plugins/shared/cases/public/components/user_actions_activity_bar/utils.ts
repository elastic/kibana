/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActivityParams } from './types';

/**
 * True when type, author, search, or source is applied. Uses committed params.
 */
export const hasActiveUserActivityFilter = (params: UserActivityParams): boolean =>
  Boolean(
    params.type !== 'all' || params.authors?.length || params.search || params.sources?.length
  );

/**
 * True when search, authors, or sources are set. Excludes type so stats can still page.
 */
export const hasSearchOrAuthorFilter = (
  params: Pick<UserActivityParams, 'search' | 'authors' | 'sources'>
): boolean => Boolean(params.search || params.authors?.length || params.sources?.length);
