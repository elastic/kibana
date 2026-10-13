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
/** Source id used when settling the native v2 ES|QL episode fetches. */
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
    name: i18n.translate('xpack.alertingV2.episodesUi.breakdownByStatus', {
      defaultMessage: 'Status',
    }),
    meta: { type: 'string' },
  },
  {
    id: 'rule.id',
    name: i18n.translate('xpack.alertingV2.episodesUi.breakdownByRule', { defaultMessage: 'Rule' }),
    meta: { type: 'string' },
  },
  {
    id: 'last_ack_action',
    name: i18n.translate('xpack.alertingV2.episodesUi.breakdownByAcknowledged', {
      defaultMessage: 'Acknowledged',
    }),
    meta: { type: 'string' },
  },
  {
    id: 'last_assignee_uid',
    name: i18n.translate('xpack.alertingV2.episodesUi.breakdownByAssignee', {
      defaultMessage: 'Assignee',
    }),
    meta: { type: 'string' },
  },
];
export const HISTOGRAM_EPISODE_LIMIT = 10_000;
export const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
