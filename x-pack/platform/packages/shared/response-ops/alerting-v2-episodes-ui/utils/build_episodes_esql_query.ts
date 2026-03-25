/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import {
  LAST_EPISODE_TIMESTAMP_ESQL_VARIABLE,
  PAGE_SIZE_ESQL_VARIABLE,
  ALERT_EVENTS_DATA_STREAM,
} from '../constants';

export interface EpisodesFilterState {
  /** Single episode status (inactive | pending | active | recovering) or null for All */
  status?: string | null;
  /** Rule ID or null */
  ruleId?: string | null;
  /** KQL query string for full-text search; applied via request filter, not inlined in ES|QL */
  kuery?: string | null;
}

export interface EpisodesSortState {
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

const ALLOWLISTED_SORT_FIELDS = new Set([
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'duration',
]);

const sanitizeSortField = (field: string) => {
  return ALLOWLISTED_SORT_FIELDS.has(field) ? field : '@timestamp';
};

const buildAlertEventsBaseQuery = () => esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`;

/**
 * Builds an ES|QL query that aggregates episode data starting from
 * the alerting-events data stream.
 */
export const buildEpisodesBaseQuery = (): ComposerQuery => {
  const timestampParam = esql.par(undefined, LAST_EPISODE_TIMESTAMP_ESQL_VARIABLE);
  // This will be simplified when the `$.alerting-episodes` ES|QL view works.
  return buildAlertEventsBaseQuery()
    .where`${timestampParam} IS NULL OR @timestamp < ${timestampParam}`
    .pipe`INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp) BY episode.id`
    .pipe`EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)`
    .pipe`WHERE @timestamp == last_timestamp`;
};

/**
 * Builds an ES|QL query for the paginated episodes request.
 * The lastEpisodeTimestamp and pageSize variables are used to perform cursor-based pagination.
 */
export const buildEpisodesPaginatedQuery = (
  sortState: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' }
): ComposerQuery => {
  const sortField = sanitizeSortField(sortState.sortField);
  const sortDir = sortState.sortDirection.toUpperCase() as 'ASC' | 'DESC';
  const pageSizeParam = esql.par(undefined, PAGE_SIZE_ESQL_VARIABLE);

  return buildEpisodesBaseQuery().sort([sortField, sortDir]).pipe`LIMIT ${pageSizeParam}`;
};

/**
 * Builds an ES|QL query to count the total number of addressable episodes.
 */
export const buildEpisodesCountQuery = (): ComposerQuery =>
  buildAlertEventsBaseQuery().pipe`STATS total = COUNT_DISTINCT(episode.id)`;
