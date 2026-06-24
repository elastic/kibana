/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-episodes-ui/constants';

export interface TopNSeriesRow {
  group_hash: string;
}

export interface BuildTopNSeriesQueryOptions {
  ruleId: string;
  windowStartMs: number;
  windowEndMs: number;
}

const toIsoUtc = (ms: number) => new Date(ms).toISOString();

const MAX_SERIES_LIMIT = 10_000;

export const buildTopNSeriesQuery = ({
  ruleId,
  windowStartMs,
  windowEndMs,
}: BuildTopNSeriesQueryOptions) => {
  const fromIso = toIsoUtc(windowStartMs);
  const toIso = toIsoUtc(windowEndMs);

  return esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`.where`rule.id == ${ruleId}`
    .where`@timestamp >= ${fromIso}::DATETIME AND @timestamp <= ${toIso}::DATETIME`
    .pipe`STATS last_event_ts = MAX(@timestamp) BY group_hash`
    .sort(['last_event_ts', 'DESC'])
    .limit(MAX_SERIES_LIMIT)
    .keep('group_hash');
};
