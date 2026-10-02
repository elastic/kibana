/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';

export type AlertTimelineSortPolicy =
  | 'started_asc'
  | 'started_desc'
  | 'longest_open'
  | 'recently_active';

export const ALERT_TIMELINE_TOP_N_DEFAULT = 8;

/** A horizontal colored span inside a lane, covering one status phase. */
export interface AlertTimelineSegment {
  episodeId: string;
  status: AlertEpisodeStatus;
  /**
   * Inclusive epoch ms of the segment's *rendered* left edge — clamped to `windowStartMs`
   * when the phase began before the visible window. Use for drawing only.
   */
  x0Ms: number;
  /** Epoch ms of the segment's right edge (the next phase's start, or `windowEndMs` for the open tail). */
  x1Ms: number;
  /**
   * The phase's true (unclamped) start in epoch ms, resolved by the untimed
   * starts query independent of the display window. Equals `x0Ms` when the start
   * is inside the visible window; earlier than `x0Ms` when the bar was clipped to
   * the window's left edge. The tooltip shows this so a clipped bar still reports
   * its real start.
   */
  trueStartMs: number;
}

/** A point marker inside a lane at a status-change timestamp. */
export interface AlertTimelineTransition {
  episodeId: string;
  status: AlertEpisodeStatus;
  tsMs: number;
}

export interface AlertTimelineSeries {
  groupHash: string;
  groupingValues: Record<string, string | null>;
  segments: AlertTimelineSegment[];
  transitions: AlertTimelineTransition[];
  firstEventMs: number;
  lastEventMs: number;
  hasOpenEpisode: boolean;
  longestOpenDurationMs: number;
  /** Number of distinct episodes contributing to this series in the visible window. */
  episodeCount: number;
}

export interface AlertTimelineSummary {
  episodesStarted: number;
  recovered: number;
  stillOpen: number;
  medianDurationMs: number;
}

export interface AlertTimelineData {
  rows: AlertTimelineSeries[];
  summary: AlertTimelineSummary;
}

/** One raw rule event used to reconstruct an episode's ordered status transitions. */
export interface AlertTimelineEventRow {
  '@timestamp': string;
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  group_hash: string;
}

/** Grouping values keyed by group hash. */
export type AlertTimelineGroupingValues = Record<string, Record<string, string | null>>;
