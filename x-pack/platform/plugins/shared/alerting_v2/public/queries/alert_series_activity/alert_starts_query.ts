/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';

/** Upper bound on phase rows per alert — the four `episode.status` values. */
const MAX_PHASES_PER_ALERT = 4;

export interface BuildAlertStartsQueryOptions {
  ruleId: string;
  /** The exact alerts being drawn (from {@link buildAlertSelectionQuery}). */
  alertIds: string[];
}

/** Raw ES|QL row: the earliest `@timestamp` per `(episode.id, episode.status)`. */
export interface AlertStartRow {
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  /** ISO timestamp — MIN(@timestamp) for this (alert, status) phase, across all time. */
  episode_start: string;
}

/**
 * Resolves each alert's true phase start, `MIN(@timestamp) BY episode.id,
 * episode.status`, scoped only by `rule.id` and the selected `episode.id`s.
 */
export const buildAlertStartsQuery = ({ ruleId, alertIds }: BuildAlertStartsQueryOptions) => {
  const alertLiterals = alertIds.map((id) => esql.str(id));

  return (
    esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`.where`rule.id == ${ruleId}`
      .where`episode.id IN (${alertLiterals})`
      .pipe`STATS episode_start = MIN(@timestamp) BY episode.id, episode.status`
      // Explicit ceiling (≤4 phases × alerts) so the implicit result cap can't clip a phase.
      .limit(Math.max(alertIds.length * MAX_PHASES_PER_ALERT, 1))
      .keep('episode.id', 'episode.status', 'episode_start')
  );
};
