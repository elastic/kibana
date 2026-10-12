/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type {
  AlertTimelineData,
  AlertTimelineGroupingValues,
  AlertTimelineEventRow,
  AlertTimelineSegment,
  AlertTimelineSeries,
  AlertTimelineSortPolicy,
  AlertTimelineSummary,
  AlertTimelineTransition,
} from './types';

const EMPTY_GROUPING_VALUES: Record<string, string | null> = {};

const isOpenStatus = (status: AlertEpisodeStatus): boolean =>
  status !== ALERT_EPISODE_STATUS.INACTIVE;

const compareSeries = (
  a: AlertTimelineSeries,
  b: AlertTimelineSeries,
  sort: AlertTimelineSortPolicy
): number => {
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
interface ParsedEvent {
  episodeId: string;
  status: AlertEpisodeStatus;
  timestampMs: number;
  groupHash: string;
  sourceIndex: number;
}

/**
 * Builds timeline lanes from ordered raw rule events. Consecutive heartbeat events in
 * the same status are collapsed, while every actual status change is preserved. An
 * open episode's last status tails to `windowEndMs`; terminal INACTIVE only marks recovery.
 */
export const deriveAlertTimelineDataFromEvents = (
  eventRows: AlertTimelineEventRow[],
  groupingValuesByHash: AlertTimelineGroupingValues,
  sort: AlertTimelineSortPolicy,
  windowStartMs: number,
  windowEndMs: number,
  summary: AlertTimelineSummary
): AlertTimelineData => {
  const eventsBySeries = new Map<string, ParsedEvent[]>();

  for (const [sourceIndex, row] of eventRows.entries()) {
    const timestampMs = Date.parse(row['@timestamp']);
    if (!Number.isFinite(timestampMs) || timestampMs > windowEndMs) continue;
    const event: ParsedEvent = {
      episodeId: row['episode.id'],
      status: row['episode.status'],
      timestampMs,
      groupHash: row.group_hash,
      sourceIndex,
    };
    const list = eventsBySeries.get(row.group_hash);
    if (list) list.push(event);
    else eventsBySeries.set(row.group_hash, [event]);
  }

  const seriesByHash = new Map<string, AlertTimelineSeries>();

  for (const [groupHash, events] of eventsBySeries) {
    const eventsByEpisode = new Map<string, ParsedEvent[]>();
    for (const event of events) {
      const list = eventsByEpisode.get(event.episodeId);
      if (list) list.push(event);
      else eventsByEpisode.set(event.episodeId, [event]);
    }

    const segments: AlertTimelineSegment[] = [];
    const transitions: AlertTimelineTransition[] = [];
    let hasOpenEpisode = false;
    let longestOpenDurationMs = 0;
    let seriesFirstMs = Infinity;
    let seriesLastMs = -Infinity;

    for (const [episodeId, episodeEvents] of eventsByEpisode) {
      episodeEvents.sort((a, b) => a.timestampMs - b.timestampMs || a.sourceIndex - b.sourceIndex);
      const statusChanges = episodeEvents.filter(
        (event, index) => index === 0 || event.status !== episodeEvents[index - 1].status
      );
      const earliestStartMs = episodeEvents[0].timestampMs;

      for (let index = 0; index < statusChanges.length; index++) {
        const event = statusChanges[index];
        const next = statusChanges[index + 1];
        transitions.push({ episodeId, status: event.status, tsMs: event.timestampMs });

        if (next && next.timestampMs > event.timestampMs) {
          segments.push({
            episodeId,
            status: event.status,
            x0Ms: event.timestampMs,
            x1Ms: next.timestampMs,
            trueStartMs: event.timestampMs,
            isOngoing: false,
          });
        } else if (!next && isOpenStatus(event.status)) {
          if (windowEndMs > event.timestampMs) {
            segments.push({
              episodeId,
              status: event.status,
              x0Ms: event.timestampMs,
              x1Ms: windowEndMs,
              trueStartMs: event.timestampMs,
              isOngoing: true,
            });
          }
          hasOpenEpisode = true;
          longestOpenDurationMs = Math.max(longestOpenDurationMs, windowEndMs - earliestStartMs);
        }
      }

      seriesFirstMs = Math.min(seriesFirstMs, earliestStartMs);
      seriesLastMs = Math.max(seriesLastMs, episodeEvents[episodeEvents.length - 1].timestampMs);
    }

    const clippedSegments = segments
      .filter((segment) => segment.x1Ms > windowStartMs)
      .map((segment) =>
        segment.x0Ms < windowStartMs ? { ...segment, x0Ms: windowStartMs } : segment
      );
    const clippedTransitions = transitions.filter((transition) => transition.tsMs >= windowStartMs);

    seriesByHash.set(groupHash, {
      groupHash,
      groupingValues: groupingValuesByHash[groupHash] ?? EMPTY_GROUPING_VALUES,
      segments: clippedSegments,
      transitions: clippedTransitions,
      firstEventMs: seriesFirstMs,
      lastEventMs: seriesLastMs,
      hasOpenEpisode,
      longestOpenDurationMs,
      episodeCount: eventsByEpisode.size,
    });
  }

  return {
    rows: [...seriesByHash.values()].sort((a, b) => compareSeries(a, b, sort)),
    summary,
  };
};
