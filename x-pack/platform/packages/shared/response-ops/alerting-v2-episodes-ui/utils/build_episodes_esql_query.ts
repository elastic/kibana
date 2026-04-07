/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { PAGE_SIZE_ESQL_VARIABLE, ALERT_EVENTS_DATA_STREAM } from '../constants';

export interface EpisodesFilterState {
  /** Single episode status (inactive | pending | active | recovering) or null for All */
  status?: string | null;
  /** Rule ID or null */
  ruleId?: string | null;
  /** Query string for full-text search */
  queryString?: string | null;
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
export const buildEpisodesBaseQuery = (search?: string): ComposerQuery => {
  const query = buildAlertEventsBaseQuery();

  if (search) {
    // The query string must be applied before EVALs and aggregations
    query.where`QSTR(${search})`;
  }

  // This will be simplified when the `$.alerting-episodes` ES|QL view works.
  query.pipe`INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp) BY episode.id`
    .pipe`EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)`
    .pipe`WHERE @timestamp == last_timestamp`;

  return query;
};

/**
 * Builds an ES|QL query for episodes request with sorting and filtering.
 */
export const buildEpisodesQuery = (
  sortState: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' },
  filterState?: EpisodesFilterState
): ComposerQuery => {
  const sortField = sanitizeSortField(sortState.sortField);
  const sortDir = sortState.sortDirection.toUpperCase() as 'ASC' | 'DESC';
  const pageSizeParam = esql.par(undefined, PAGE_SIZE_ESQL_VARIABLE);

  let query = buildEpisodesBaseQuery(filterState?.queryString?.trim());

  if (filterState?.status) {
    query = query.where`episode.status == ${filterState.status}`;
  }

  if (filterState?.ruleId) {
    query = query.where`rule.id == ${filterState.ruleId}`;
  }

  return query.sort([sortField, sortDir]).pipe`LIMIT ${pageSizeParam}`;
};
