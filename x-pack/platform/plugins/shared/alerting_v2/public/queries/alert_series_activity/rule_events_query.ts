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
 * Per-episode (`episode.id`) cap on raw events. Applied via `LIMIT ... BY` so a
 * single high-frequency episode cannot consume the whole `pageSize` budget and
 * starve the other episodes in its series (lane) — in particular older,
 * completed episodes that a busy active episode would otherwise evict entirely.
 * The most-recent events per episode are kept (the query SORTs `@timestamp`
 * DESC); each episode's true left edge is restored separately via the start
 * anchors query (`buildAlertTimelineAnchorsQuery`). The global `pageSize` limit
 * is retained as a hard ceiling.
 */
export const PER_EPISODE_EVENT_LIMIT = 200;

export interface BuildRuleEventsEsqlQueryOptions {
  ruleId: string;
  gteMs: number;
  lteMs: number;
  pageSize: number;
  /** When provided, restricts results to these series only. */
  groupHashes?: string[];
  /** Max events kept per `episode.id`. Defaults to {@link PER_EPISODE_EVENT_LIMIT}. */
  perEpisodeLimit?: number;
}

const toIsoUtc = (ms: number) => new Date(ms).toISOString();

export const buildRuleEventsEsqlQuery = ({
  ruleId,
  gteMs,
  lteMs,
  pageSize,
  groupHashes,
  perEpisodeLimit = PER_EPISODE_EVENT_LIMIT,
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
    .pipe`LIMIT ${perEpisodeLimit} BY episode.id`
    .limit(pageSize)
    .keep(...RULE_EVENT_FIELDS);
};
