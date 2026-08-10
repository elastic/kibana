/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from './alert_action_schema';
import { alertEpisodeSchema } from './alert_episode_schema';

const baseEpisode = {
  '@timestamp': '2026-04-10T12:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-04-10T11:00:00.000Z',
  last_timestamp: '2026-04-10T12:00:00.000Z',
  duration: 3600000,
};

describe('alertEpisodeSchema', () => {
  it('accepts a minimal episode row', () => {
    const result = alertEpisodeSchema.safeParse(baseEpisode);
    expect(result.success).toBe(true);
  });

  it('accepts null on nullable fields', () => {
    const result = alertEpisodeSchema.safeParse({
      ...baseEpisode,
      last_assignee_uid: null,
      episode_data: null,
      severity: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown keys', () => {
    const result = alertEpisodeSchema.safeParse({
      ...baseEpisode,
      extra: true,
    });
    expect(result.success).toBe(false);
  });
});
