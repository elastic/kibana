/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';

/**
 * Selects the alerts the alert timeline draws, scoped to the chosen top-N
 * series. One row per alert (its series + most-recent activity in the window).
 * `LIMIT ... BY group_hash` gives each series its own alert budget, so a busy
 * series can't crowd out quieter ones. Start/phases come from {@link buildAlertPhasesQuery}.
 */
export interface AlertSelectionRow {
  'episode.id': string;
  group_hash: string;
  last_ts: string;
}

/** Per-series cap on alerts drawn. A render-density limit (each alert is ~4 phase rows), so it can be generous. */
export const MAX_ALERTS_PER_LANE = 50;

export interface BuildAlertSelectionQueryOptions {
  ruleId: string;
  windowStartMs: number;
  windowEndMs: number;
  /** Series (lanes) to restrict selection to — the chosen top-N `group_hash`es. */
  groupHashes: string[];
  /** Max alerts kept per series. Defaults to {@link MAX_ALERTS_PER_LANE}. */
  perLaneLimit?: number;
}

const toIsoUtc = (ms: number) => new Date(ms).toISOString();

export const buildAlertSelectionQuery = ({
  ruleId,
  windowStartMs,
  windowEndMs,
  groupHashes,
  perLaneLimit = MAX_ALERTS_PER_LANE,
}: BuildAlertSelectionQueryOptions) => {
  const fromIso = toIsoUtc(windowStartMs);
  const toIso = toIsoUtc(windowEndMs);
  const hashLiterals = groupHashes.map((h) => esql.str(h));

  return (
    // Per-lane fairness, then a global ceiling so the implicit result cap can't clip us.
    esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`.where`rule.id == ${ruleId}`
      .where`@timestamp >= ${fromIso}::DATETIME AND @timestamp <= ${toIso}::DATETIME`
      .where`group_hash IN (${hashLiterals})`
      .pipe`STATS last_ts = MAX(@timestamp) BY episode.id, group_hash`.sort(['last_ts', 'DESC'])
      .pipe`LIMIT ${perLaneLimit} BY group_hash`
      .limit(Math.max(groupHashes.length * perLaneLimit, 1))
      .keep('episode.id', 'group_hash', 'last_ts')
  );
};
