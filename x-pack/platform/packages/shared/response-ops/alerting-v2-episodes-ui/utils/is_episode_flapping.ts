/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, size, takeRight } from 'lodash';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';

export interface FlappingSettings {
  lookBackWindow: number;
  statusChangeThreshold: number;
}

export const DEFAULT_EPISODE_FLAPPING_SETTINGS: FlappingSettings = {
  lookBackWindow: 20,
  statusChangeThreshold: 4,
};

const FLAPPING_STATUSES = new Set<AlertEpisodeStatus>([
  ALERT_EPISODE_STATUS.ACTIVE,
  ALERT_EPISODE_STATUS.RECOVERING,
]);

/**
 * Counts active <-> recovering transitions in the last `lookBackWindow` statuses.
 * Transitions involving pending/inactive do not count.
 */
export const countEpisodeStateChanges = (
  statuses: AlertEpisodeStatus[],
  settings: FlappingSettings = DEFAULT_EPISODE_FLAPPING_SETTINGS
): number => {
  const window = takeRight(statuses, settings.lookBackWindow);
  return size(
    filter(window, (curr, i) => {
      if (i === 0) {
        return false;
      }
      const prev = window[i - 1];
      return prev !== curr && FLAPPING_STATUSES.has(prev) && FLAPPING_STATUSES.has(curr);
    })
  );
};

/**
 * Returns true when the episode has a full look-back window of events and the
 * number of active <-> recovering transitions in that window meets the threshold.
 */
export const isEpisodeFlapping = (
  statuses: AlertEpisodeStatus[],
  settings: FlappingSettings = DEFAULT_EPISODE_FLAPPING_SETTINGS
): boolean => {
  // Only evaluate flapping once we have a full look-back window of events.
  if (size(statuses) < settings.lookBackWindow) {
    return false;
  }
  return countEpisodeStateChanges(statuses, settings) >= settings.statusChangeThreshold;
};
