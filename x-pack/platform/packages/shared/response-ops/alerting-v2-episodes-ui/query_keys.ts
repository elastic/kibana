/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodesFilterState, EpisodesSortState } from './utils/build_episodes_esql_query';

function serializeFilterState(f: EpisodesFilterState | undefined): string {
  if (!f) return '';
  return JSON.stringify({
    s: f.status ?? null,
    r: f.ruleId ?? null,
    k: f.kuery ?? null,
  });
}

function serializeSortState(s: EpisodesSortState): string {
  return `${s.sortField}:${s.sortDirection}`;
}

export const queryKeys = {
  all: ['alert-episodes'] as const,
  list: (
    pageSize: number,
    filterState?: EpisodesFilterState,
    sortState?: EpisodesSortState,
    timeRange?: { from: string; to: string } | null
  ) =>
    [
      ...queryKeys.all,
      'list',
      pageSize,
      serializeFilterState(filterState),
      sortState ? serializeSortState(sortState) : '',
      timeRange ? `${timeRange.from}-${timeRange.to}` : '',
    ] as const,
};
