/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { escapeStringValue } from '@kbn/esql-utils';
import {
  applyFilterState,
  buildEpisodesBaseQuery,
  type EpisodesFilterState,
} from '@kbn/alerting-v2-common-queries';
import type { AlertEpisode as BaseAlertEpisode } from '@kbn/alerting-v2-schemas';
import { HISTOGRAM_EPISODE_LIMIT } from '../constants';

export type { EpisodesFilterState, EpisodesSortState } from '@kbn/alerting-v2-common-queries';

/**
 * Extension of the base AlertEpisode type with client-only capability flags
 * used to differentiate classic alert rows from v2 episode rows.
 * These fields are never set by the v2 pipeline.
 */
export interface AlertEpisode extends BaseAlertEpisode {
  /**
   * Whether the row supports v2 episode actions (ack, assign, snooze). Classic
   * alert rows set this to `false`; v2 episodes default to `true`.
   */
  supports_actions?: boolean;
  /**
   * Whether the row supports the v2 episode timeline/events flyout. Classic
   * alert rows set this to `false` (they use a simpler fields flyout);
   * v2 episodes default to `true`.
   */
  supports_timeline?: boolean;
  /**
   * Rule name embedded from the classic alert document. Used as a display fallback
   * when the rules API cannot resolve the name (e.g. due to RBAC restrictions).
   * V2 episodes never set this — they always resolve via the rules cache.
   */
  'rule.name'?: string;
}

/** V2 episodes leave `supports_actions` unset; classic rows set it to `false`. */
export const episodeSupportsActions = (episode: AlertEpisode): boolean =>
  episode.supports_actions !== false;

/** V2 episodes leave `supports_timeline` unset; classic rows set it to `false`. */
export const episodeSupportsTimeline = (episode: AlertEpisode): boolean =>
  episode.supports_timeline !== false;

/**
 * Builds an ES|QL query that computes six KPI counts in a single STATS pass.
 * Uses indicator EVALs (CASE-based 0/1 columns) so all aggregations can share
 * one STATS command without sub-queries.
 *
 * Counts: active_alerts, firing_rules, assigned_to_me, unassigned, acknowledged, snoozed.
 */
export const buildEpisodesKpisQuery = (
  spaceId: string,
  currentUserUid?: string,
  filterState?: EpisodesFilterState
): string => {
  const query = buildEpisodesBaseQuery(spaceId, filterState);

  if (filterState) {
    applyFilterState(query, filterState);
  }

  // Indicator columns — null for distinct count, 1/0 for sum-based counts.
  // When there's no current user (anonymous/proxy-authenticated), nothing can be
  // "assigned to me", so the indicator is always 0.
  // prettier-ignore
  query
    .pipe`EVAL _active_rule_id = CASE(\`episode.status\` == "active", \`rule.id\`, null)`
    .pipe(
      currentUserUid
        ? `EVAL _assigned_to_me = CASE(last_assignee_uid == ${escapeStringValue(currentUserUid)}, 1, 0)`
        : `EVAL _assigned_to_me = 0`
    )
    .pipe`EVAL _is_unassigned  = CASE(last_assignee_uid IS NULL, 1, 0)`
    .pipe`EVAL _is_acked       = CASE(last_ack_action == "ack", 1, 0)`
    .pipe`EVAL _is_snoozed     = CASE(last_snooze_action == "snooze" AND (snooze_expiry IS NULL OR TO_DATETIME(snooze_expiry) > NOW()), 1, 0)`
    .pipe`STATS
      alerts_count   = COUNT(*),
      firing_rules   = COUNT_DISTINCT(_active_rule_id),
      assigned_to_me = SUM(_assigned_to_me),
      unassigned     = SUM(_is_unassigned),
      acknowledged   = SUM(_is_acked),
      snoozed        = SUM(_is_snoozed)`;

  return query.print('basic');
};

/**
 * Builds a lightweight ESQL query for histogram data.
 * Returns only the fields needed for overlap counting; no SORT.
 * Time range is applied by the caller via executeEsqlQuery's input.timeRange.
 */
export const buildEpisodesHistogramQuery = (
  spaceId: string,
  filterState?: EpisodesFilterState,
  breakdownField?: string
): ComposerQuery => {
  const query = buildEpisodesBaseQuery(spaceId, filterState);

  if (filterState) {
    applyFilterState(query, filterState);
  }

  const keepFields = [
    ...new Set(
      ['first_timestamp', 'last_timestamp', 'episode.status', breakdownField].filter(
        (f): f is string => Boolean(f)
      )
    ),
  ];

  return query.keep(...(keepFields as [string, ...string[]])).limit(HISTOGRAM_EPISODE_LIMIT);
};
