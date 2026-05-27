/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { EpisodeEventRow } from '../queries/episode_events_query';

/**
 * Last row by @timestamp order (caller should pass rows sorted ascending by time).
 */
export const getLastEpisodeStatus = (rows: EpisodeEventRow[]): AlertEpisodeStatus | undefined => {
  if (!rows.length) {
    return undefined;
  }
  return rows[rows.length - 1]['episode.status'];
};

export const getRuleIdFromEpisodeRows = (rows: EpisodeEventRow[]): string | undefined => {
  for (const row of rows) {
    const id = row['rule.id'];
    if (id && id.length) {
      return id;
    }
  }
  return undefined;
};

/** ISO timestamp string of the first event where episode.status === 'active'. */
export const getTriggeredTimestamp = (rows: EpisodeEventRow[]): string | undefined => {
  for (const row of rows) {
    if (row['episode.status'] === 'active') {
      return row['@timestamp'];
    }
  }
  return undefined;
};

export const getGroupHashFromEpisodeRows = (rows: EpisodeEventRow[]): string | undefined => {
  for (const row of rows) {
    const hash = row.group_hash;
    if (hash && hash.length) {
      return hash;
    }
  }
  return undefined;
};

export const getEpisodeDurationMs = (
  rows: EpisodeEventRow[],
  now = Date.now()
): number | undefined => {
  if (!rows.length) return undefined;

  const a = Date.parse(rows[0]['@timestamp']);
  if (Number.isNaN(a)) return undefined;

  const lastStatus = rows[rows.length - 1]['episode.status'];
  const isOngoing = lastStatus === 'active' || lastStatus === 'pending';
  const b = isOngoing ? now : Date.parse(rows[rows.length - 1]['@timestamp']);
  if (Number.isNaN(b)) return undefined;

  return Math.max(0, b - a);
};
