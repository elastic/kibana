/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { isEpisodeSnoozed } from './is_episode_snoozed';

describe('isEpisodeSnoozed', () => {
  it('returns false when last action is not snooze', () => {
    expect(isEpisodeSnoozed(ALERT_EPISODE_ACTION_TYPE.UNSNOOZE, null)).toBe(false);
    expect(isEpisodeSnoozed(null, '2035-01-01T00:00:00.000Z')).toBe(false);
    expect(isEpisodeSnoozed(undefined, null)).toBe(false);
  });

  it('returns true for an indefinite snooze', () => {
    expect(isEpisodeSnoozed(ALERT_EPISODE_ACTION_TYPE.SNOOZE, null)).toBe(true);
    expect(isEpisodeSnoozed(ALERT_EPISODE_ACTION_TYPE.SNOOZE, undefined)).toBe(true);
  });

  it('returns true when snooze expiry is in the future', () => {
    expect(isEpisodeSnoozed(ALERT_EPISODE_ACTION_TYPE.SNOOZE, '2035-06-15T14:30:00.000Z')).toBe(
      true
    );
  });

  it('returns false when snooze expiry is in the past', () => {
    expect(isEpisodeSnoozed(ALERT_EPISODE_ACTION_TYPE.SNOOZE, '2020-01-01T00:00:00.000Z')).toBe(
      false
    );
  });
});
