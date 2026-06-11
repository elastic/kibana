/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-episodes-ui/constants';

/**
 * Per-episode start anchor: the earliest event timestamp for each episode within
 * the fetched (buffered) window. The raw-events query only fetches the most
 * recent events per episode, so a long-running episode's true left edge is not
 * present in that result. The timeline uses this anchor to draw a single flat
 * segment from the episode's start to its first fetched event, so the bar starts
 * in the right place without paying to fetch every intermediate (redundant)
 * same-status event.
 *
 * Returns one row per episode across the supplied `group_hash`es (a series), so
 * the result scales with the number of episodes, not the rule's firing
 * frequency.
 */
export interface AlertTimelineAnchorRow {
  'episode.id': string;
  first_ts: string;
}

export interface BuildAlertTimelineAnchorsQueryOptions {
  ruleId: string;
  gteMs: number;
  lteMs: number;
  groupHashes: string[];
}

const toIsoUtc = (ms: number) => new Date(ms).toISOString();

export const buildAlertTimelineAnchorsQuery = ({
  ruleId,
  gteMs,
  lteMs,
  groupHashes,
}: BuildAlertTimelineAnchorsQueryOptions) => {
  const fromIso = toIsoUtc(gteMs);
  const toIso = toIsoUtc(lteMs);
  const hashLiterals = groupHashes.map((h) => esql.str(h));

  // prettier-ignore
  return esql.from(ALERT_EVENTS_DATA_STREAM)
    .where`type == "alert"`
    .where`rule.id == ${ruleId}`
    .where`@timestamp >= ${fromIso}::DATETIME AND @timestamp <= ${toIso}::DATETIME`
    .where`group_hash IN (${hashLiterals})`
    .pipe`STATS first_ts = MIN(@timestamp) BY episode.id`
    .keep('episode.id', 'first_ts');
};

/** Map of `episode.id` -> earliest event epoch-ms within the fetched window. */
export const parseAnchorRows = (rows: readonly AlertTimelineAnchorRow[]): Map<string, number> => {
  const anchorByEpisode = new Map<string, number>();
  for (const row of rows) {
    const tsMs = Date.parse(row.first_ts);
    if (Number.isFinite(tsMs)) {
      anchorByEpisode.set(row['episode.id'], tsMs);
    }
  }
  return anchorByEpisode;
};
