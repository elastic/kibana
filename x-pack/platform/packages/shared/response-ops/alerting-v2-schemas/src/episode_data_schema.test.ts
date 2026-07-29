/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { episodeDataSchema } from './episode_data_schema';

const baseEpisode = {
  episode_id: 'ep-1',
  episode_status: 'inactive' as const,
  rule_id: 'rule-1',
  group_hash: 'group-1',
  first_timestamp: '2026-07-29T14:41:46.565Z',
  last_timestamp: '2026-07-29T14:42:46.565Z',
  duration: 60000,
  space_id: 'default',
};

describe('episodeDataSchema', () => {
  it('accepts a minimal episode without optional fields', () => {
    expect(episodeDataSchema.parse(baseEpisode)).toEqual(baseEpisode);
  });

  it('accepts null for ES|QL-absent optional fields', () => {
    expect(
      episodeDataSchema.parse({
        ...baseEpisode,
        triggered_at: null,
        severity: null,
        episode_data: null,
        last_ack_action: null,
        last_assignee_uid: null,
        last_snooze_action: null,
        snooze_expiry: null,
      })
    ).toEqual({
      ...baseEpisode,
      triggered_at: null,
      severity: null,
      episode_data: null,
      last_ack_action: null,
      last_assignee_uid: null,
      last_snooze_action: null,
      snooze_expiry: null,
    });
  });

  it('stringifies object episode_data from JSON_EXTRACT', () => {
    expect(
      episodeDataSchema.parse({
        ...baseEpisode,
        episode_data: { count: '1487' },
      })
    ).toEqual({
      ...baseEpisode,
      episode_data: '{"count":"1487"}',
    });
  });

  it('preserves string episode_data', () => {
    expect(
      episodeDataSchema.parse({
        ...baseEpisode,
        episode_data: '{"host.name":"h1"}',
      }).episode_data
    ).toBe('{"host.name":"h1"}');
  });
});
