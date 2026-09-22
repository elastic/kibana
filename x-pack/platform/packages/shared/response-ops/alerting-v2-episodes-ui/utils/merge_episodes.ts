/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode, EpisodesSortState } from '../queries/episodes_query';
import {
  EPISODE_SEVERITY_CHART_VALUE,
  isSupportedEpisodeSeverity,
  normalizeEpisodeSeverity,
  type EpisodeSeverity,
} from '../components/severity/severity_utils';

const NO_SEVERITY_RANK = -1;

const DATE_SORT_FIELDS = new Set([
  '@timestamp',
  'first_timestamp',
  'last_timestamp',
  'triggered_at',
  'snooze_expiry',
]);

const getSeverityRank = (severity: AlertEpisode['severity']): number => {
  if (!isSupportedEpisodeSeverity(severity)) {
    return NO_SEVERITY_RANK;
  }
  return EPISODE_SEVERITY_CHART_VALUE[normalizeEpisodeSeverity(severity) as EpisodeSeverity];
};

const toMillis = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return Number.NEGATIVE_INFINITY;
};

const compareValues = (a: unknown, b: unknown): number => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b));
};

const compareEpisodes = (a: AlertEpisode, b: AlertEpisode, sortField: string): number => {
  if (sortField === 'severity') {
    return getSeverityRank(a.severity) - getSeverityRank(b.severity);
  }
  if (DATE_SORT_FIELDS.has(sortField)) {
    return (
      toMillis(a[sortField as keyof AlertEpisode]) - toMillis(b[sortField as keyof AlertEpisode])
    );
  }
  return compareValues(a[sortField as keyof AlertEpisode], b[sortField as keyof AlertEpisode]);
};

export const mergeEpisodes = (
  episodeLists: AlertEpisode[][],
  sortState: EpisodesSortState,
  pageSize: number
): AlertEpisode[] => {
  const direction = sortState.sortDirection === 'asc' ? 1 : -1;

  return episodeLists
    .flat()
    .sort((a, b) => direction * compareEpisodes(a, b, sortState.sortField))
    .slice(0, pageSize);
};
