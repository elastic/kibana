/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';

export const ALERT_EVENTS_DATA_STREAM = '.rule-events';
export const ALERT_ACTIONS_DATA_STREAM = '.alert-actions';
export const LAST_EPISODE_TIMESTAMP_ESQL_VARIABLE = 'lastEpisodeTimestamp';
export const PAGE_SIZE_ESQL_VARIABLE = 'pageSize';
export const RELATED_ALERT_EPISODES_PAGE_SIZE = 5;
export const TIME_FIELD = '@timestamp';
/**
 * Fields produced by buildEpisodesHistogramQuery that are valid as breakdown dimensions.
 * Passed as esqlColumns to UnifiedBreakdownFieldSelector to restrict the picker to only
 * fields the episode pipeline actually fetches.
 */
export const HISTOGRAM_BREAKDOWN_COLUMNS: DatatableColumn[] = [
  // Effective status takes into account any resolved action being applied to the episode
  {
    id: 'effective_status',
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
