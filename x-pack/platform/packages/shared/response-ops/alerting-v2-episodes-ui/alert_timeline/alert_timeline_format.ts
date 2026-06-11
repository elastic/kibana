/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';

export const formatTimestamp = (ms: number, timeZone?: string): string =>
  new Date(ms).toLocaleString(
    i18n.getLocale(),
    timeZone && timeZone !== 'Browser' ? { timeZone } : undefined
  );

/**
 * Human-readable duration from milliseconds (`2h 15m`).
 * Returns `fallback` (default `'0m'`) for non-positive / non-finite input.
 */
export const formatDuration = (ms: number, fallback = '0m'): string => {
  if (!Number.isFinite(ms) || ms <= 0) return fallback;
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export interface SegmentSpanFlags {
  /**
   * The span's left edge sits at (or before) the window's start, so its true
   * start is earlier and is not knowable from the fetched events — the bar was
   * clipped. The tooltip should say "Outside of window" rather than show the
   * window edge as if it were the start.
   */
  startsBeforeWindow: boolean;
  /**
   * The span runs to the window's right edge and the episode has not recovered
   * (status is not inactive), i.e. it is still open. The tooltip should say
   * "Ongoing" rather than show the window edge as a (false) end.
   */
  isOngoing: boolean;
}

/**
 * Classify a rendered segment's edges relative to the visible window so the
 * tooltip can avoid presenting clipped window edges as real start/end times.
 * Segments are built with `x0Ms` clamped to `gteMs` when clipped and the open
 * tail's `x1Ms` set to `lteMs`, so edge equality is a reliable signal.
 */
export const describeSegmentSpan = ({
  x0Ms,
  x1Ms,
  status,
  gteMs,
  lteMs,
}: {
  x0Ms: number;
  x1Ms: number;
  status: AlertEpisodeStatus;
  gteMs: number;
  lteMs: number;
}): SegmentSpanFlags => ({
  startsBeforeWindow: x0Ms <= gteMs,
  isOngoing: x1Ms >= lteMs && status !== ALERT_EPISODE_STATUS.INACTIVE,
});
