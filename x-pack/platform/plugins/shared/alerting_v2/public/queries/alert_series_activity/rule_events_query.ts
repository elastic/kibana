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

/**
 * Per-series (`group_hash`) cap on raw events. Applied via `LIMIT ... BY` so a
 * single overactive series cannot consume the whole `pageSize` budget and
 * starve quieter lanes (including their pre-window lookback events, which the
 * timeline relies on to anchor each lane's left-edge status). The global
 * `pageSize` limit is retained as a hard ceiling.
 *
 * The caller is responsible for clamping the query window to at most
 * `PER_SERIES_EVENT_LIMIT × scheduleInterval` so that scan cost scales with
 * the limit rather than with the user-selected time range.
 */
export const PER_SERIES_EVENT_LIMIT = 10000;

export interface BuildRuleEventsEsqlQueryOptions {
  ruleId: string;
  gteMs: number;
  lteMs: number;
  pageSize: number;
  /** When provided, restricts results to these series only. */
  groupHashes?: string[];
  /** Max events kept per `group_hash`. Defaults to {@link PER_SERIES_EVENT_LIMIT}. */
  perSeriesLimit?: number;
}

const toIsoUtc = (ms: number) => new Date(ms).toISOString();

export const buildRuleEventsEsqlQuery = ({
  ruleId,
  gteMs,
  lteMs,
  pageSize,
  groupHashes,
  perSeriesLimit = PER_SERIES_EVENT_LIMIT,
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

  // prettier-ignore
  return query
    .sort([TIME_FIELD, 'DESC'])
    .pipe`LIMIT ${perSeriesLimit} BY group_hash`
    .limit(pageSize)
    .keep(...RULE_EVENT_FIELDS);
};
