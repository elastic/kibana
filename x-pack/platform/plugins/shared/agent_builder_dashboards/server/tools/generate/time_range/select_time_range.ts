/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Keep generated dashboard defaults focused and cheap to render.
 *
 * Data newer than this is shown relative to `now`; older data gets an absolute
 * range anchored to the dataset's newest timestamp.
 */
export const DEFAULT_TIME_RANGE_CAP_DAYS = 30;
const CAP_MS = DEFAULT_TIME_RANGE_CAP_DAYS * DAY_MS;

/** Live data (a doc within the last 24h) keeps the standard 24h default window. */
const LIVE_CAP_MS = DAY_MS;

/**
 * Historical windows (anchored to data that ended more than the cap ago) stay
 * narrow — loading a month of an old dataset by default is too slow.
 */
const HISTORICAL_CAP_MS = 2 * DAY_MS;

/** Never produce a window narrower than this (avoids a degenerate single-point range). */
const MIN_WINDOW_MS = HOUR_MS;

/** Where a dataset's data sits in time, as returned by the min/max probe. */
export interface DatasetTimeRange {
  index: string;
  timeField: string;
  /** Epoch ms of the oldest document for `timeField`. */
  minMs: number;
  /** Epoch ms of the newest document for `timeField`. */
  maxMs: number;
}

/** A dashboard time range, shaped to the attachment schema's `time_range`. */
type SelectedTimeRange = NonNullable<DashboardAttachmentData['time_range']>;

interface SelectedWindow {
  fromMs: number;
  toMs: number;
  /** `relative` => anchor to `now` (live/recent data); `absolute` => anchor to the newest data. */
  mode: 'relative' | 'absolute';
}

/**
 * Compute the absolute [from, to] window in epoch ms from the probed datasets.
 *
 * - Anchor on the most recent dataset (latest `max`).
 * - `to` is `now` when the newest data is within the cap of now, else the newest
 *   data itself (the historical case).
 * - The width cap depends on the tier: 24h for live data (a doc within the last
 *   24h), {@link CAP_MS} for staler-but-current data (the window must reach back
 *   to the data), and {@link HISTORICAL_CAP_MS} for historical windows.
 * - Drop datasets whose data sits entirely before the anchor window; widen `from`
 *   to cover the others, but never earlier than `to - cap` and never later than
 *   the oldest relevant data (shrink-to-fit for short datasets).
 * - Floor the window width at {@link MIN_WINDOW_MS}.
 */
const computeWindow = (datasets: DatasetTimeRange[], nowMs: number): SelectedWindow | undefined => {
  const withData = datasets.filter(
    (d) => Number.isFinite(d.minMs) && Number.isFinite(d.maxMs) && d.maxMs >= d.minMs
  );
  if (withData.length === 0) {
    return undefined;
  }

  const anchorMax = Math.max(...withData.map((d) => d.maxMs));
  const isCurrent = nowMs - anchorMax <= CAP_MS;
  const toMs = isCurrent ? nowMs : anchorMax;

  const isLive = nowMs - anchorMax <= LIVE_CAP_MS;
  const capMs = isCurrent ? (isLive ? LIVE_CAP_MS : CAP_MS) : HISTORICAL_CAP_MS;
  const windowStart = toMs - capMs;
  // Datasets whose newest data reaches into [windowStart, toMs] are relevant; the
  // rest are older/non-overlapping and intentionally dropped (their panel may be empty).
  const relevant = withData.filter((d) => d.maxMs >= windowStart);
  const oldestRelevantMin = Math.min(...relevant.map((d) => d.minMs));

  let fromMs = Math.max(windowStart, oldestRelevantMin);
  if (toMs - fromMs < MIN_WINDOW_MS) {
    fromMs = toMs - MIN_WINDOW_MS;
  }

  return { fromMs, toMs, mode: isCurrent ? 'relative' : 'absolute' };
};

/**
 * Convert a relative window width into Kibana date math, rounding up so the
 * rendered range does not clip the selected data.
 */
const renderRelativeFrom = (gapMs: number): string => {
  if (gapMs <= DAY_MS) {
    const hours = Math.max(1, Math.ceil(gapMs / HOUR_MS));
    return `now-${hours}h`;
  }
  const days = Math.min(DEFAULT_TIME_RANGE_CAP_DAYS, Math.ceil(gapMs / DAY_MS));
  return `now-${days}d/d`;
};

const renderTimeRange = (window: SelectedWindow, nowMs: number): SelectedTimeRange => {
  if (window.mode === 'absolute') {
    return {
      from: new Date(window.fromMs).toISOString(),
      // ES|QL time filters use an exclusive upper bound, so include the newest document.
      to: new Date(window.toMs + 1).toISOString(),
      mode: 'absolute',
    };
  }
  return {
    from: renderRelativeFrom(nowMs - window.fromMs),
    to: 'now',
    mode: 'relative',
  };
};

/**
 * Pick a data-aware default dashboard time range from the probed datasets, or
 * `undefined` when none of them hold data (caller keeps today's default).
 */
export const selectTimeRange = (
  datasets: DatasetTimeRange[],
  nowMs: number
): SelectedTimeRange | undefined => {
  const window = computeWindow(datasets, nowMs);
  return window ? renderTimeRange(window, nowMs) : undefined;
};
