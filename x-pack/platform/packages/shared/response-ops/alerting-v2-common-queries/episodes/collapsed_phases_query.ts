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
 * Scoped by the selected `episode.id`s and, when given, bounded to the display
 * window — this query supplies the segment *geometry* drawn in view. The bar's
 * true start is resolved separately by the untimed `buildAlertStartsQuery`
 * (window-independent) and overlaid via `applyAlertStarts`.
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
  /** Number of events merged into this phase. */
  event_count: number;
}

export interface AlertSeverityPhaseRow {
  'episode.id': string;
  severity: string | null;
  seg_start: string;
  /** Number of events merged into this severity phase. */
  event_count: number;
}

export interface BuildAlertPhasesQueryOptions {
  /** Omit for alerts that have no rule, such as externally ingested alerts. */
  ruleId?: string;
  /** Restricts the events to one space. */
  spaceId?: string;
  /** The exact alerts being drawn (from `buildAlertSelectionQuery`). */
  alertIds: string[];
  /** Display window (epoch ms) — segments are drawn within it. Omit to cover each alert's whole lifetime. */
  window?: {
    startMs: number;
    endMs: number;
  };
}

const toIsoUtc = (ms: number) => new Date(ms).toISOString();

const buildAlertEventsSource = ({
  ruleId,
  spaceId,
  alertIds,
  window,
}: BuildAlertPhasesQueryOptions) => {
  const alertLiterals = alertIds.map((id) => esql.str(id));

  let query = esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`;

  if (spaceId !== undefined) {
    query = query.where`space_id == ${spaceId}`;
  }

  if (ruleId !== undefined) {
    query = query.where`rule.id == ${ruleId}`;
  }

  if (window) {
    const fromIso = toIsoUtc(window.startMs);
    const toIso = toIsoUtc(window.endMs);
    query = query.where`@timestamp >= ${fromIso}::DATETIME AND @timestamp <= ${toIso}::DATETIME`;
  }

  return query.where`episode.id IN (${alertLiterals})`;
};

export const buildCollapsedStatusPhasesQuery = (
  options: BuildAlertPhasesQueryOptions
): TypedEsqlQuery<AlertPhaseRow> =>
  asTypedEsqlQuery<AlertPhaseRow>(
    buildAlertEventsSource(options)
      .pipe`STATS seg_start = MIN(@timestamp), seg_end = MAX(@timestamp), event_count = COUNT(*) BY episode.id, episode.status, group_hash`
      // Explicit ceiling (≤4 phases × alerts) so the implicit result cap can't clip a phase.
      .limit(Math.max(options.alertIds.length * MAX_PHASES_PER_ALERT, 1))
      .keep('episode.id', 'episode.status', 'group_hash', 'seg_start', 'seg_end', 'event_count')
  );

/**
 * Severity counterpart of {@link buildCollapsedStatusPhasesQuery}: one row per `severity`
 * per alert, with the same flapping caveat (non-contiguous runs are merged).
 */
export const buildCollapsedSeverityPhasesQuery = (
  options: BuildAlertPhasesQueryOptions
): TypedEsqlQuery<AlertSeverityPhaseRow> =>
  asTypedEsqlQuery<AlertSeverityPhaseRow>(
    buildAlertEventsSource(options)
      .pipe`STATS seg_start = MIN(@timestamp), event_count = COUNT(*) BY episode.id, severity`.keep(
      'episode.id',
      'severity',
      'seg_start',
      'event_count'
    )
  );
