/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeEventRow } from '@kbn/alerting-v2-common-queries';
import {
  isSupportedEpisodeSeverity,
  normalizeEpisodeSeverity,
  type EpisodeSeverity,
} from '@kbn/alerting-v2-common-queries';
import { resolveEpisodeEventData } from '../utils/resolve_episode_event_data';

export interface EpisodeSeverityTimelineSegment {
  severity: EpisodeSeverity;
  x0Ms: number;
  x1Ms: number;
  timestamp: string;
  eventData: Record<string, unknown> | null;
}

interface ParsedSeverityEvent {
  timestampMs: number;
  severity?: EpisodeSeverity;
  timestamp: string;
  eventData: Record<string, unknown> | null;
}

/** Derives contiguous severity spans using every episode event as a time boundary. */
export const deriveEpisodeSeverityTimelineData = (
  eventRows: EpisodeEventRow[],
  windowEndMs: number
): EpisodeSeverityTimelineSegment[] => {
  const events: ParsedSeverityEvent[] = eventRows
    .map((row) => {
      const timestampMs = Date.parse(row['@timestamp']);
      return {
        timestampMs,
        timestamp: row['@timestamp'],
        eventData: resolveEpisodeEventData(row),
        severity: isSupportedEpisodeSeverity(row.severity)
          ? normalizeEpisodeSeverity(row.severity)
          : undefined,
      };
    })
    .filter(({ timestampMs }) => Number.isFinite(timestampMs))
    .sort((left, right) => left.timestampMs - right.timestampMs);

  const segments: EpisodeSeverityTimelineSegment[] = [];
  events.forEach((event, index) => {
    const x1Ms = events[index + 1]?.timestampMs ?? windowEndMs;
    if (!event.severity || x1Ms <= event.timestampMs) {
      return;
    }

    const previous = segments.at(-1);
    if (previous?.severity === event.severity && previous.x1Ms === event.timestampMs) {
      previous.x1Ms = x1Ms;
      return;
    }

    segments.push({
      severity: event.severity,
      x0Ms: event.timestampMs,
      x1Ms,
      timestamp: event.timestamp,
      eventData: event.eventData,
    });
  });

  return segments;
};
