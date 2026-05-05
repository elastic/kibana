/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from '@kbn/alerting-v2-episodes-ui/constants';

export interface RuleEventRow {
  '@timestamp': string;
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  'rule.id': string;
  group_hash: string;
}

const RULE_EVENT_FIELDS = [
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'group_hash',
] as const;

export interface BuildRuleEventsEsqlQueryOptions {
  ruleId: string;
  gteMs: number;
  lteMs: number;
  pageSize: number;
}

const toIsoUtc = (ms: number) => new Date(ms).toISOString();

/**
 * ES|QL query returning every alert event for a rule inside the visible
 * window, oldest first. Used to derive Gantt lane segments + transition
 * markers from the underlying state-change stream rather than the episode
 * summary rows.
 */
export const buildRuleEventsEsqlQuery = ({
  ruleId,
  gteMs,
  lteMs,
  pageSize,
}: BuildRuleEventsEsqlQueryOptions) => {
  const fromIso = toIsoUtc(gteMs);
  const toIso = toIsoUtc(lteMs);
  // prettier-ignore
  return esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`
    .where`rule.id == ${ruleId}`
    .where`@timestamp >= ${fromIso}::DATETIME AND @timestamp <= ${toIso}::DATETIME`
    .sort([TIME_FIELD, 'ASC'])
    .limit(pageSize)
    .keep(...RULE_EVENT_FIELDS);
};
