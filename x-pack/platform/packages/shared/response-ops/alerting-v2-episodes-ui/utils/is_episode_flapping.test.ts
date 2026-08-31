/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concat, constant, times } from 'lodash';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { countEpisodeStateChanges, isEpisodeFlapping } from './is_episode_flapping';

const { ACTIVE, RECOVERING, PENDING, INACTIVE } = ALERT_EPISODE_STATUS;

const alternate = (
  a: AlertEpisodeStatus,
  b: AlertEpisodeStatus,
  count: number
): AlertEpisodeStatus[] => times(count, (i) => (i % 2 === 0 ? a : b));

describe('countEpisodeStateChanges', () => {
  it('counts both active->recovering and recovering->active transitions', () => {
    const statuses = [ACTIVE, RECOVERING, ACTIVE, RECOVERING, ACTIVE];
    expect(countEpisodeStateChanges(statuses)).toBe(4);
  });

  it('ignores consecutive same-status events', () => {
    const statuses = [ACTIVE, ACTIVE, ACTIVE, RECOVERING, RECOVERING, ACTIVE];
    expect(countEpisodeStateChanges(statuses)).toBe(2);
  });

  it('ignores transitions involving pending or inactive', () => {
    const statuses = [PENDING, ACTIVE, INACTIVE, RECOVERING, ACTIVE, PENDING];
    expect(countEpisodeStateChanges(statuses)).toBe(1);
  });

  it('only counts changes within the look-back window', () => {
    // 5 changes outside the window, then a full window of stable ACTIVE
    const statuses = concat(alternate(ACTIVE, RECOVERING, 10), times(20, constant(ACTIVE)));
    expect(
      countEpisodeStateChanges(statuses, {
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      })
    ).toBe(0);
  });
});

describe('isEpisodeFlapping', () => {
  it('returns false when fewer than lookBackWindow events exist', () => {
    // 10 changes but only 11 events — below the window of 20
    const statuses = alternate(ACTIVE, RECOVERING, 11);
    expect(isEpisodeFlapping(statuses)).toBe(false);
  });

  it('returns false when changes are below threshold', () => {
    // 3 changes in 20 events: [A,R,A] + 17 recovering
    const statuses = concat(alternate(ACTIVE, RECOVERING, 3), times(17, constant(RECOVERING)));
    expect(statuses).toHaveLength(20);
    expect(isEpisodeFlapping(statuses)).toBe(false);
  });

  it('returns true when changes exceed the threshold', () => {
    const statuses = alternate(ACTIVE, RECOVERING, 20);
    expect(isEpisodeFlapping(statuses)).toBe(true);
  });

  it('ignores older events outside the look-back window', () => {
    // First 10 alternate (many changes), last 20 are stable — not flapping
    const statuses = concat(alternate(ACTIVE, RECOVERING, 10), times(20, constant(ACTIVE)));
    expect(isEpisodeFlapping(statuses)).toBe(false);
  });

  it('respects custom settings', () => {
    const settings = { lookBackWindow: 6, statusChangeThreshold: 2 };
    // 1 change in a full window of 6
    const below = concat([ACTIVE], times(5, constant(RECOVERING)));
    // 2 changes in a full window of 6
    const at = concat(alternate(ACTIVE, RECOVERING, 3), times(3, constant(ACTIVE)));
    expect(isEpisodeFlapping(below, settings)).toBe(false);
    expect(isEpisodeFlapping(at, settings)).toBe(true);
  });
});
