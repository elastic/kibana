/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { SeriesGroupingValuesByHash } from '../queries/alert_series_activity/series_grouping_values_query';

export type GanttSortPolicy = 'started_asc' | 'started_desc' | 'longest_open' | 'recently_active';

export const GANTT_TOP_N_DEFAULT = 8;

export interface GanttEpisode {
  episodeId: string;
  status: AlertEpisodeStatus;
  firstMs: number;
  lastMs: number;
  durationMs: number;
  isOpen: boolean;
}

export interface GanttSeries {
  groupHash: string;
  groupingValues: Record<string, string | null>;
  episodes: GanttEpisode[];
  firstEventMs: number;
  lastEventMs: number;
  hasOpenEpisode: boolean;
  longestOpenDurationMs: number;
}

export interface GanttSummary {
  episodesStarted: number;
  recovered: number;
  stillOpen: number;
  medianDurationMs: number;
}

export interface GanttData {
  rows: GanttSeries[];
  hiddenRowCount: number;
  totalRowCount: number;
  summary: GanttSummary;
}

const EMPTY_GROUPING_VALUES: Record<string, string | null> = {};

const isOpenStatus = (status: AlertEpisodeStatus): boolean =>
  status !== ALERT_EPISODE_STATUS.INACTIVE;

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const compareSeries = (a: GanttSeries, b: GanttSeries, sort: GanttSortPolicy): number => {
  switch (sort) {
    case 'started_asc':
      return a.firstEventMs - b.firstEventMs;
    case 'started_desc':
      return b.firstEventMs - a.firstEventMs;
    case 'longest_open':
      return b.longestOpenDurationMs - a.longestOpenDurationMs;
    case 'recently_active':
      return b.lastEventMs - a.lastEventMs;
  }
};

/**
 * Derive Gantt-chart-ready rows + summary stats from a flat episodes response,
 * grouped by `group_hash` and sorted by the chosen policy. Episodes inside a
 * series are always sorted ascending by start time so bars layer left-to-right.
 */
export const deriveGanttData = (
  episodes: AlertEpisode[],
  groupingValuesByHash: SeriesGroupingValuesByHash,
  sort: GanttSortPolicy,
  topN: number = GANTT_TOP_N_DEFAULT
): GanttData => {
  const seriesByHash = new Map<string, GanttSeries>();

  for (const ep of episodes) {
    const firstMs = Date.parse(ep.first_timestamp);
    const lastMs = Date.parse(ep.last_timestamp);
    if (!Number.isFinite(firstMs) || !Number.isFinite(lastMs)) continue;

    const status = ep['episode.status'];
    const open = isOpenStatus(status);
    const durationMs = Math.max(0, lastMs - firstMs);

    const ganttEp: GanttEpisode = {
      episodeId: ep['episode.id'],
      status,
      firstMs,
      lastMs,
      durationMs,
      isOpen: open,
    };

    const existing = seriesByHash.get(ep.group_hash);
    if (existing) {
      existing.episodes.push(ganttEp);
      existing.firstEventMs = Math.min(existing.firstEventMs, firstMs);
      existing.lastEventMs = Math.max(existing.lastEventMs, lastMs);
      existing.hasOpenEpisode = existing.hasOpenEpisode || open;
      if (open && durationMs > existing.longestOpenDurationMs) {
        existing.longestOpenDurationMs = durationMs;
      }
    } else {
      seriesByHash.set(ep.group_hash, {
        groupHash: ep.group_hash,
        groupingValues: groupingValuesByHash[ep.group_hash] ?? EMPTY_GROUPING_VALUES,
        episodes: [ganttEp],
        firstEventMs: firstMs,
        lastEventMs: lastMs,
        hasOpenEpisode: open,
        longestOpenDurationMs: open ? durationMs : 0,
      });
    }
  }

  for (const series of seriesByHash.values()) {
    series.episodes.sort((a, b) => a.firstMs - b.firstMs);
  }

  const allRows = [...seriesByHash.values()].sort((a, b) => compareSeries(a, b, sort));
  const totalRowCount = allRows.length;
  const visibleRows = allRows.slice(0, topN);
  const hiddenRowCount = Math.max(0, totalRowCount - visibleRows.length);

  let recovered = 0;
  let stillOpen = 0;
  const recoveredDurations: number[] = [];
  for (const ep of episodes) {
    const open = isOpenStatus(ep['episode.status']);
    if (open) {
      stillOpen++;
    } else {
      recovered++;
      const firstMs = Date.parse(ep.first_timestamp);
      const lastMs = Date.parse(ep.last_timestamp);
      if (Number.isFinite(firstMs) && Number.isFinite(lastMs)) {
        recoveredDurations.push(Math.max(0, lastMs - firstMs));
      }
    }
  }

  return {
    rows: visibleRows,
    hiddenRowCount,
    totalRowCount,
    summary: {
      episodesStarted: episodes.length,
      recovered,
      stillOpen,
      medianDurationMs: median(recoveredDurations),
    },
  };
};
