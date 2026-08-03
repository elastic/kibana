/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import {
  isSupportedEpisodeSeverity,
  normalizeEpisodeSeverity,
  type EpisodeSeverity,
} from '../../severity/severity_utils';
import type { EpisodeActionHistoryEntry } from '../../../queries/episode_actions_history_query';

export interface StateChangeSourceRow {
  '@timestamp': string;
  'episode.status': AlertEpisodeStatus;
  event_count?: number;
}

export interface StateChangeEntry {
  kind: 'state_change';
  timestamp: string;
  newStatus: AlertEpisodeStatus;
  /** undefined when this is the episode's initial status */
  prevStatus: AlertEpisodeStatus | undefined;
  prevEventCount: number;
}

export interface SeverityChangeSourceRow {
  '@timestamp': string;
  severity?: string | null;
  event_count?: number;
}

export interface SeverityChangeEntry {
  kind: 'severity_change';
  timestamp: string;
  newSeverity: EpisodeSeverity;
  /** undefined when this is the episode's initial supported severity */
  prevSeverity: EpisodeSeverity | undefined;
  prevEventCount: number;
}

export interface ActionEntry {
  kind: 'action';
  entry: EpisodeActionHistoryEntry;
}

export type TimelineEntry = StateChangeEntry | SeverityChangeEntry | ActionEntry;

/** Icon shown on the avatar for each action type (no system actor profile). */
export const ACTION_ICON: Record<string, IconType> = {
  ack: 'checkInCircleFilled',
  unack: 'minusInCircle',
  snooze: 'bellSlash',
  unsnooze: 'bell',
  deactivate: 'checkInCircleFilled',
  activate: 'refresh',
  tag: 'tag',
  assign: 'user',
};

/**
 * Collapses a chronological run of episode event rows into the status
 * transitions between them, tracking how many events preceded each change.
 */
export const deriveStateChangeEntries = (eventRows: StateChangeSourceRow[]): StateChangeEntry[] => {
  const entries: StateChangeEntry[] = [];
  let prevStatus: AlertEpisodeStatus | undefined;
  let runCount = 0;

  for (const row of eventRows) {
    const status = row['episode.status'];
    const eventCount = row.event_count ?? 1;
    if (status !== prevStatus) {
      entries.push({
        kind: 'state_change',
        timestamp: row['@timestamp'],
        newStatus: status,
        prevStatus,
        prevEventCount: runCount,
      });
      prevStatus = status;
      runCount = eventCount;
    } else {
      runCount += eventCount;
    }
  }

  return entries;
};

/**
 * Collapses a chronological run of episode severity rows into the supported
 * severity transitions between them, tracking how many events preceded each change.
 */
export const deriveSeverityChangeEntries = (
  eventRows: SeverityChangeSourceRow[]
): SeverityChangeEntry[] => {
  const entries: SeverityChangeEntry[] = [];
  let prevSeverity: EpisodeSeverity | undefined;
  let runCount = 0;

  for (const row of eventRows) {
    const { severity } = row;
    if (!isSupportedEpisodeSeverity(severity)) {
      continue;
    }

    const normalizedSeverity = normalizeEpisodeSeverity(severity);
    const eventCount = row.event_count ?? 1;
    if (normalizedSeverity !== prevSeverity) {
      entries.push({
        kind: 'severity_change',
        timestamp: row['@timestamp'],
        newSeverity: normalizedSeverity,
        prevSeverity,
        prevEventCount: runCount,
      });
      prevSeverity = normalizedSeverity;
      runCount = eventCount;
    } else {
      runCount += eventCount;
    }
  }

  return entries;
};

const getEntryTimestamp = (entry: TimelineEntry): string =>
  entry.kind === 'action' ? entry.entry['@timestamp'] : entry.timestamp;

/** Break timestamp ties by putting severity changes and actions ahead of state changes,
 * since the initial state and severity rows share the exact same timestamp when they
 * originate from the same underlying event, and "Episode started" (the initial state
 * change) must sort as the oldest, bottom-most entry in the newest-first list. */
const KIND_PRIORITY: Record<TimelineEntry['kind'], number> = {
  severity_change: 0,
  action: 1,
  state_change: 2,
};

/** Merges state changes, severity changes, and action history into a single newest-first list. */
export const mergeTimelineEntries = (
  stateChangeEntries: StateChangeEntry[],
  severityChangeEntries: SeverityChangeEntry[],
  actionEntries: EpisodeActionHistoryEntry[]
): TimelineEntry[] => {
  const actionItems: TimelineEntry[] = actionEntries.map((entry) => ({ kind: 'action', entry }));
  return [...stateChangeEntries, ...severityChangeEntries, ...actionItems].sort((a, b) => {
    const timestampComparison = getEntryTimestamp(b).localeCompare(getEntryTimestamp(a));
    return timestampComparison !== 0
      ? timestampComparison
      : KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
  });
};

export const formatTimestamp = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
