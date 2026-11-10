/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';

export const EMPTY_VALUE = '—';
export const LAST_EPISODE_TIMESTAMP_ESQL_VARIABLE = 'lastEpisodeTimestamp';
export const RELATED_ALERT_EPISODES_PAGE_SIZE = 5;
/** Max episodes returned per list page (ESQL LIMIT). */
export const ALERT_EPISODES_LIST_PAGE_SIZE = 1000;
/** Row source id for native v2 episodes. Not a source-filter value. */
export const ALERTING_V2_EPISODE_SOURCE_ID = 'v2';
export const QUERY_STALE_TIME = 30_000;
/**
 * Fields produced by buildEpisodesHistogramQuery that are valid as breakdown dimensions.
 * Passed as esqlColumns to UnifiedBreakdownFieldSelector to restrict the picker to only
 * fields the episode pipeline actually fetches.
 */
export const HISTOGRAM_BREAKDOWN_COLUMNS: DatatableColumn[] = [
  {
    id: 'episode.status',
    name: i18n.translate('xpack.alertingV2EpisodesUi.episodesUi.breakdownByStatus', {
      defaultMessage: 'Status',
    }),
    meta: { type: 'string' },
  },
  {
    id: 'rule.id',
    name: i18n.translate('xpack.alertingV2EpisodesUi.episodesUi.breakdownByRule', {
      defaultMessage: 'Rule',
    }),
    meta: { type: 'string' },
  },
  {
    id: 'last_ack_action',
    name: i18n.translate('xpack.alertingV2EpisodesUi.episodesUi.breakdownByAcknowledged', {
      defaultMessage: 'Acknowledged',
    }),
    meta: { type: 'string' },
  },
  {
    id: 'last_assignee_uid',
    name: i18n.translate('xpack.alertingV2EpisodesUi.episodesUi.breakdownByAssignee', {
      defaultMessage: 'Assignee',
    }),
    meta: { type: 'string' },
  },
];
export const HISTOGRAM_EPISODE_LIMIT = 10_000;
/** Upper bound on histogram buckets per request; mirrors the `histogram:maxBars` default. */
export const HISTOGRAM_MAX_BUCKETS = 1000;
/** Maximum breakdown values drawn as their own histogram series; the rest are folded into one series. */
export const HISTOGRAM_MAX_BREAKDOWN_SERIES = 9;
/** Breakdown value for episodes and alerts without a value for the breakdown field. */
export const HISTOGRAM_UNKNOWN_BREAKDOWN = 'unknown';
/** Breakdown value of the series that folds every value beyond the top `HISTOGRAM_MAX_BREAKDOWN_SERIES`. */
export const HISTOGRAM_OTHER_BREAKDOWN = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesHistogram.otherBreakdown',
  { defaultMessage: 'Other' }
);
export const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
