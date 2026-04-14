/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { EVENT_LOG_PROVIDER, EVENT_LOG_ACTIONS } from '../execution_event_logger';
import type {
  GetExecutionLogParams,
  GetExecutionKpiParams,
  GetExecutionBreakdownParams,
} from './types';

const EVENT_LOG_INDEX = '.kibana-event-log-*';
const NS_TO_MS = 1_000_000;
const EXECUTION_LOG_LIMIT = 100;

export const getExecutionLogQuery = ({
  ruleId,
  dateStart,
  dateEnd,
  sort,
  statusFilter,
  search,
}: GetExecutionLogParams): ComposerQuery => {
  const query = esql.from(EVENT_LOG_INDEX);

  query.where`event.provider == ${EVENT_LOG_PROVIDER}
    AND event.action == ${EVENT_LOG_ACTIONS.execute}
    AND kibana.alerting.instance_id == ${{ ruleId }}
    AND @timestamp >= ${dateStart}
    AND @timestamp <= ${dateEnd}`;

  if (statusFilter) {
    query.where`event.outcome == ${statusFilter}`;
  }

  if (search) {
    query.where`message LIKE ${`*${search}*`}`;
  }

  query.pipe`EVAL duration_ms = event.duration / ${NS_TO_MS},
    display_message = COALESCE(error.message, message),
    active_alerts = kibana.alert.rule.execution.metrics.alert_counts.active`;

  query.keep(
    '@timestamp',
    'kibana.task.scheduled',
    'duration_ms',
    'event.outcome',
    'display_message',
    'active_alerts'
  );

  query.sort(['@timestamp', sort === 'asc' ? 'ASC' : 'DESC']);
  query.pipe`LIMIT ${EXECUTION_LOG_LIMIT}`;

  return query;
};

export const getExecutionKpiQuery = ({
  ruleId,
  dateStart,
  dateEnd,
}: GetExecutionKpiParams): ComposerQuery => {
  const query = esql.from(EVENT_LOG_INDEX);

  query.where`event.provider == ${EVENT_LOG_PROVIDER}
    AND event.action == ${EVENT_LOG_ACTIONS.execute}
    AND kibana.alerting.instance_id == ${{ ruleId }}
    AND @timestamp >= ${dateStart}
    AND @timestamp <= ${dateEnd}`;

  query.pipe`STATS
    succeeded = COUNT(*) WHERE event.outcome == "success",
    failed = COUNT(*) WHERE event.outcome == "failure"`;

  return query;
};

export const getExecutionBreakdownQuery = ({
  ruleId,
  dateStart,
  dateEnd,
  bucketInterval,
}: GetExecutionBreakdownParams): ComposerQuery => {
  const query = esql.from(EVENT_LOG_INDEX);

  query.where`event.provider == ${EVENT_LOG_PROVIDER}
    AND event.action == ${EVENT_LOG_ACTIONS.execute}
    AND kibana.alerting.instance_id == ${{ ruleId }}
    AND @timestamp >= ${dateStart}
    AND @timestamp <= ${dateEnd}`;

  query.pipe`STATS
    failed = COUNT(*) WHERE event.outcome == "failure",
    succeeded = COUNT(*) WHERE event.outcome == "success"
    BY bucket = BUCKET(@timestamp, ${bucketInterval})`;

  query.sort(['bucket', 'ASC']);

  return query;
};
