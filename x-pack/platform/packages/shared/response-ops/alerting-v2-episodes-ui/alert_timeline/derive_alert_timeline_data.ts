/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type {
  AlertTimelineData,
  AlertTimelineEventRow,
  AlertTimelineGroupingValues,
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
  tsMs: number;
  groupHash: string;
}

/**
 * Derive alert-timeline-ready lanes from raw rule event rows in a single pass.
 * Each lane (series) splits its episodes into one segment per state span:
 * the segment between event N and event N+1 takes event N's status. An open
 * episode (last event is not INACTIVE) emits a tail segment running to
 * `lteMs`.
 *
 * Summary stats and the total series count are supplied externally (computed
 * by a dedicated ES|QL aggregation) so this function no longer re-iterates
 * every event for episode-level metrics.
 *
 * `anchorByEpisode` maps `episode.id` to the episode's earliest event timestamp
 * within the fetched window. The events query only returns the most-recent
 * events per episode, so a long episode's earliest fetched event is mid-episode;
 * the anchor lets us draw one flat segment from the true start to that first
 * fetched event, restoring the truncated left edge without fetching every
 * intermediate same-status event.
 */
export const deriveAlertTimelineData = (
  eventRows: AlertTimelineEventRow[],
  groupingValuesByHash: AlertTimelineGroupingValues,
  sort: AlertTimelineSortPolicy,
  gteMs: number,
  lteMs: number,
  summary: AlertTimelineSummary,
  totalSeriesCount: number,
  anchorByEpisode: Map<string, number> = new Map()
): AlertTimelineData => {
  const eventsBySeries = new Map<string, ParsedEvent[]>();

  for (const row of eventRows) {
    const tsMs = Date.parse(row['@timestamp']);
    if (!Number.isFinite(tsMs)) continue;
    const ev: ParsedEvent = {
      episodeId: row['episode.id'],
      status: row['episode.status'],
      tsMs,
      groupHash: row.group_hash,
    };
    const list = eventsBySeries.get(row.group_hash);
    if (list) {
      list.push(ev);
    } else {
      eventsBySeries.set(row.group_hash, [ev]);
    }
  }

  const seriesByHash = new Map<string, AlertTimelineSeries>();

  for (const [groupHash, events] of eventsBySeries) {
    events.sort((a, b) => a.tsMs - b.tsMs);

    const eventsByEpisode = new Map<string, ParsedEvent[]>();
    for (const ev of events) {
      const list = eventsByEpisode.get(ev.episodeId);
      if (list) list.push(ev);
      else eventsByEpisode.set(ev.episodeId, [ev]);
    }

    const segments: AlertTimelineSegment[] = [];
    const transitions: AlertTimelineTransition[] = [];
    let hasOpenEpisode = false;
    let longestOpenDurationMs = 0;

    // Coalesce consecutive same-status events into a single segment per
    // episode. Without this, a rule that re-fires the same status every tick
    // would emit one tiny rect per tick — at full-window zoom they render as
    // a striped band because of sub-pixel anti-aliasing on each edge.
    const pushSegment = (s: AlertTimelineSegment) => {
      const last = segments[segments.length - 1];
      if (
        last &&
        last.episodeId === s.episodeId &&
        last.status === s.status &&
        last.x1Ms === s.x0Ms
      ) {
        last.x1Ms = s.x1Ms;
      } else {
        segments.push(s);
      }
    };

    for (const [episodeId, episodeEvents] of eventsByEpisode) {
      const collapsedEvents: ParsedEvent[] = [];
      for (const ev of episodeEvents) {
        const last = collapsedEvents[collapsedEvents.length - 1];
        if (last && last.tsMs === ev.tsMs) {
          collapsedEvents[collapsedEvents.length - 1] = ev;
        } else {
          collapsedEvents.push(ev);
        }
      }

      // Restore the episode's truncated left edge. The events query only fetches
      // the most-recent events per episode, so for a long episode the earliest
      // fetched event is mid-episode. The anchor (the episode's true earliest
      // timestamp in the fetched window) lets us prepend one flat segment from
      // the start up to the first fetched event. It carries no transition dot —
      // we have no event data in that range — so we also seed
      // `lastTransitionStatus` so the first real event does not emit a spurious
      // dot at the fetch boundary.
      const anchorMs = anchorByEpisode.get(episodeId);
      const firstEventMs = episodeEvents[0]?.tsMs;
      const hasLeadingAnchor =
        anchorMs !== undefined && firstEventMs !== undefined && anchorMs < firstEventMs;

      if (hasLeadingAnchor) {
        pushSegment({
          episodeId,
          status: episodeEvents[0].status,
          x0Ms: anchorMs,
          x1Ms: firstEventMs,
        });
      }

      let lastTransitionStatus: AlertEpisodeStatus | undefined = hasLeadingAnchor
        ? collapsedEvents[0]?.status
        : undefined;
      for (const ev of collapsedEvents) {
        if (ev.status !== lastTransitionStatus) {
          transitions.push({ episodeId, status: ev.status, tsMs: ev.tsMs });
          lastTransitionStatus = ev.status;
        }
      }

      for (let i = 0; i < episodeEvents.length; i++) {
        const ev = episodeEvents[i];
        const next = episodeEvents[i + 1];
        if (next) {
          if (next.tsMs > ev.tsMs) {
            pushSegment({ episodeId, status: ev.status, x0Ms: ev.tsMs, x1Ms: next.tsMs });
          }
        } else if (isOpenStatus(ev.status)) {
          if (lteMs > ev.tsMs) {
            pushSegment({ episodeId, status: ev.status, x0Ms: ev.tsMs, x1Ms: lteMs });
          }
          hasOpenEpisode = true;
          const firstTs = episodeEvents[0]?.tsMs ?? ev.tsMs;
          const openDuration = Math.max(0, lteMs - firstTs);
          if (openDuration > longestOpenDurationMs) longestOpenDurationMs = openDuration;
        }
      }
    }

    // Clip to the visible window. Pre-window events are fetched as a
    // lookback buffer (so we know the episode's status at gteMs and don't
    // emit a misleading "transition" dot at the left edge), but we don't
    // want to render anything to the left of gteMs.
    const clippedSegments: AlertTimelineSegment[] = [];
    for (const s of segments) {
      if (s.x1Ms <= gteMs) continue;
      clippedSegments.push(s.x0Ms < gteMs ? { ...s, x0Ms: gteMs } : s);
    }
    const clippedTransitions = transitions.filter((t) => t.tsMs >= gteMs);

    seriesByHash.set(groupHash, {
      groupHash,
      groupingValues: groupingValuesByHash[groupHash] ?? EMPTY_GROUPING_VALUES,
      segments: clippedSegments,
      transitions: clippedTransitions,
      firstEventMs: events[0].tsMs,
      lastEventMs: events[events.length - 1].tsMs,
      hasOpenEpisode,
      longestOpenDurationMs,
      episodeCount: eventsByEpisode.size,
    });
  }

  const rows = [...seriesByHash.values()].sort((a, b) => compareSeries(a, b, sort));

  return {
    rows,
    hiddenRowCount: Math.max(0, totalSeriesCount - rows.length),
    totalRowCount: totalSeriesCount,
    summary,
  };
};
