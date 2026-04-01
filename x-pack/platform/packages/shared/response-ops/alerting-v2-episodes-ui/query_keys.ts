/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodesFilterState, EpisodesSortState } from './utils/build_episodes_esql_query';

export const queryKeys = {
  all: ['alert-episodes'] as const,
  list: (
    pageSize: number,
    filterState?: EpisodesFilterState,
    sortState?: EpisodesSortState,
    timeRange?: { from: string; to: string } | null
  ) => [...queryKeys.all, 'list', pageSize, filterState, sortState, timeRange] as const,
};
