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
  /** Inclusive epoch ms of the segment's left edge (the phase's start). */
  x0Ms: number;
  /** Epoch ms of the segment's right edge (the next phase's start, or `lteMs` for the open tail). */
  x1Ms: number;
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
  hiddenRowCount: number;
  totalRowCount: number;
  summary: AlertTimelineSummary;
}

/**
 * One status phase of an episode (a pre-aggregated span) — the row shape accepted
 * by deriveAlertTimelineData. Each row is `MIN`/`MAX` of `@timestamp` for a
 * contiguous run of one `episode.status`, so an episode is described by ≤4 rows
 * instead of thousands of raw heartbeat events.
 */
export interface AlertTimelinePhaseRow {
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  group_hash: string;
  /** ISO timestamp — MIN(@timestamp) for this (episode, status) phase. */
  seg_start: string;
  /** ISO timestamp — MAX(@timestamp) for this (episode, status) phase. */
  seg_end: string;
}

/** Grouping values keyed by group hash. */
export type AlertTimelineGroupingValues = Record<string, Record<string, string | null>>;
