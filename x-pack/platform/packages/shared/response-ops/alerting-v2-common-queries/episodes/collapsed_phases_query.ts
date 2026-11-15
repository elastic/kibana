/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { asTypedEsqlQuery, type TypedEsqlQuery } from './typed_esql_query';

/**
 * Collapses each alert's per-execution events into status *phases*: one
 * `[seg_start, seg_end]` row per contiguous `episode.status` run (≤4 per alert).
 * Scoped by the selected `episode.id`s and bounded to the display window — this
 * query supplies the segment *geometry* drawn in view. The bar's true start is
 * resolved separately by the untimed `buildAlertStartsQuery` (window-independent)
 * and overlaid via `applyAlertStarts`.
 *
 * Caveat — flapping: `BY episode.id, episode.status` merges non-contiguous runs of
 * the same status (active → recovering → active collapses to one active span).
 */

/** The four `episode.status` values — upper bound on phase rows per alert. */
const MAX_PHASES_PER_ALERT = 4;

export interface AlertPhaseRow {
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  group_hash: string;
  seg_start: string;
  seg_end: string;
}

export interface BuildAlertPhasesQueryOptions {
  ruleId: string;
  /** The exact alerts being drawn. */
  alertIds: string[];
  /** Display window (epoch ms) — segments are drawn within it. */
  window: {
    startMs: number;
    endMs: number;
  };
}

const toIsoUtc = (ms: number) => new Date(ms).toISOString();

export const buildCollapsedStatusPhasesQuery = ({
  ruleId,
  alertIds,
  window,
}: BuildAlertPhasesQueryOptions): TypedEsqlQuery<AlertPhaseRow> => {
  const fromIso = toIsoUtc(window.startMs);
  const toIso = toIsoUtc(window.endMs);
  const alertLiterals = alertIds.map((id) => esql.str(id));

  return asTypedEsqlQuery<AlertPhaseRow>(
    esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`.where`rule.id == ${ruleId}`
      .where`@timestamp >= ${fromIso}::DATETIME AND @timestamp <= ${toIso}::DATETIME`
      .where`episode.id IN (${alertLiterals})`
      .pipe`STATS seg_start = MIN(@timestamp), seg_end = MAX(@timestamp) BY episode.id, episode.status, group_hash`
      // Explicit ceiling (≤4 phases × alerts) so the implicit result cap can't clip a phase.
      .limit(Math.max(alertIds.length * MAX_PHASES_PER_ALERT, 1))
      .keep('episode.id', 'episode.status', 'group_hash', 'seg_start', 'seg_end')
  );
};
