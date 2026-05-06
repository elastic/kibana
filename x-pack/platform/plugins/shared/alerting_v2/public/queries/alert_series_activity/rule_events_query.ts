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
  /** When provided, restricts results to these series only. */
  groupHashes?: string[];
}

const toIsoUtc = (ms: number) => new Date(ms).toISOString();

/**
 * ES|QL query returning alert events for a rule inside the given window,
 * newest first. When the LIMIT is reached, the most recent events survive
 * and the oldest are dropped — ensuring the right edge of the chart (the
 * current state) is always accurate. The consumer sorts per-episode
 * chronologically client-side.
 *
 * When `groupHashes` is supplied the result set is scoped to only those
 * series, keeping the wire payload proportional to the number of visible
 * timeline lanes instead of all series in the rule.
 */
export const buildRuleEventsEsqlQuery = ({
  ruleId,
  gteMs,
  lteMs,
  pageSize,
  groupHashes,
}: BuildRuleEventsEsqlQueryOptions) => {
  const fromIso = toIsoUtc(gteMs);
  const toIso = toIsoUtc(lteMs);

  // prettier-ignore
  let query = esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`
    .where`rule.id == ${ruleId}`
    .where`@timestamp >= ${fromIso}::DATETIME AND @timestamp <= ${toIso}::DATETIME`;

  if (groupHashes && groupHashes.length > 0) {
    const hashLiterals = groupHashes.map((h) => esql.str(h));
    query = query.where`group_hash IN (${hashLiterals})`;
  }

  return query
    .sort([TIME_FIELD, 'DESC'])
    .limit(pageSize)
    .keep(...RULE_EVENT_FIELDS);
};
