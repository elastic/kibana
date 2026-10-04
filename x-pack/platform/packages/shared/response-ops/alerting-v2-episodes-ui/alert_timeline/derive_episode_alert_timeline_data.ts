/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeEventRow } from '@kbn/alerting-v2-common-queries';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertTimelineSeries } from './types';
import { deriveAlertTimelineDataFromEvents } from './derive_alert_timeline_events';

export interface EpisodeAlertTimelineData {
  row: AlertTimelineSeries;
  windowStartMs: number;
  windowEndMs: number;
}

interface ParsedEpisodeEvent {
  row: EpisodeEventRow;
  timestampMs: number;
}

const EMPTY_SUMMARY = {
  episodesStarted: 0,
  recovered: 0,
  stillOpen: 0,
  medianDurationMs: 0,
};

/** Adapts one episode's raw events to the shared alert-timeline series model. */
export const deriveEpisodeAlertTimelineData = (
  eventRows: EpisodeEventRow[],
  currentTimeMs: number
): EpisodeAlertTimelineData | undefined => {
  const events: ParsedEpisodeEvent[] = eventRows
    .map((row) => ({ row, timestampMs: Date.parse(row['@timestamp']) }))
    .filter(({ timestampMs }) => Number.isFinite(timestampMs))
    .sort((left, right) => left.timestampMs - right.timestampMs);

  const firstEvent = events[0];
  const lastEvent = events.at(-1);
  if (!firstEvent || !lastEvent) {
    return undefined;
  }

  const isRecovered = lastEvent.row['episode.status'] === ALERT_EPISODE_STATUS.INACTIVE;
  const windowStartMs = firstEvent.timestampMs;
  const windowEndMs = isRecovered
    ? Math.max(lastEvent.timestampMs, windowStartMs + 1)
    : Math.max(currentTimeMs, lastEvent.timestampMs, windowStartMs + 1);
  const timelineData = deriveAlertTimelineDataFromEvents(
    eventRows,
    {},
    'started_asc',
    windowStartMs,
    windowEndMs,
    EMPTY_SUMMARY
  );
  const row = timelineData.rows[0];

  return row ? { row, windowStartMs, windowEndMs } : undefined;
};
