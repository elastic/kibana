/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  bulkCreateAlertActionBodySchema,
  bulkCreateEpisodeAlertActionBodySchema,
  bulkCreateSeriesAlertActionBodySchema,
  createAckEpisodeActionBodySchema,
  createAlertActionBodySchema,
  createEpisodeAlertActionBodySchema,
  createSeriesAlertActionBodySchema,
  episodeAlertActionParamsSchema,
  seriesAlertActionParamsSchema,
} from './alert_action_schema';

describe('createAlertActionBodySchema', () => {
  it('accepts a valid ack action', () => {
    const result = createAlertActionBodySchema.parse({
      action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
      episode_id: 'episode-1',
    });

    expect(result).toEqual({
      action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
      episode_id: 'episode-1',
    });
  });

  it('rejects unknown keys on a discriminated union variant (strict)', () => {
    expect(() =>
      createAlertActionBodySchema.parse({
        action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
        episode_id: 'episode-1',
        unknownField: 'x',
      })
    ).toThrow();
  });
});

describe('bulkCreateAlertActionBodySchema', () => {
  it('accepts a valid bulk item for every action variant (strict union intersected with group_hash)', () => {
    const items = [
      { action_type: ALERT_EPISODE_ACTION_TYPE.ACK, episode_id: 'episode-1', group_hash: 'g1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.UNACK, episode_id: 'episode-1', group_hash: 'g1' },
      {
        action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
        episode_id: 'episode-1',
        assignee_uid: null,
        group_hash: 'g1',
      },
      { action_type: ALERT_EPISODE_ACTION_TYPE.TAG, tags: ['p1'], group_hash: 'g1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE, group_hash: 'g1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE, group_hash: 'g1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE, reason: 'reason', group_hash: 'g1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE, reason: 'reason', group_hash: 'g1' },
    ];

    expect(() => bulkCreateAlertActionBodySchema.parse(items)).not.toThrow();
  });

  it('rejects unknown keys on the bulk group_hash wrapper (strict)', () => {
    expect(() =>
      bulkCreateAlertActionBodySchema.parse([
        {
          action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
          episode_id: 'episode-1',
          group_hash: 'group-1',
          unknownField: 'x',
        },
      ])
    ).toThrow();
  });
});

describe('createSeriesAlertActionBodySchema', () => {
  it('accepts every series-level action variant', () => {
    const variants = [
      { action_type: ALERT_EPISODE_ACTION_TYPE.TAG, tags: ['p1'] },
      { action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE, expiry: '2026-08-12T00:00:00.000Z' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE },
      { action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE },
    ];

    for (const variant of variants) {
      expect(() => createSeriesAlertActionBodySchema.parse(variant)).not.toThrow();
    }
  });

  it('rejects episode-level action types', () => {
    expect(() =>
      createSeriesAlertActionBodySchema.parse({
        action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
      })
    ).toThrow();
    expect(() =>
      createSeriesAlertActionBodySchema.parse({
        action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
        reason: 'reason',
      })
    ).toThrow();
  });
});

describe('createEpisodeAlertActionBodySchema', () => {
  it('accepts every episode-level action variant', () => {
    const variants = [
      { action_type: ALERT_EPISODE_ACTION_TYPE.ACK },
      { action_type: ALERT_EPISODE_ACTION_TYPE.UNACK },
      { action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN, assignee_uid: 'u1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN, assignee_uid: null },
      { action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE, reason: 'reason' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE, reason: 'reason' },
    ];

    for (const variant of variants) {
      expect(() => createEpisodeAlertActionBodySchema.parse(variant)).not.toThrow();
    }
  });

  it('rejects series-level action types', () => {
    expect(() =>
      createEpisodeAlertActionBodySchema.parse({
        action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
        tags: ['p1'],
      })
    ).toThrow();
  });

  it('rejects episode_id in the body (strict, the episode is addressed by the path)', () => {
    expect(() =>
      createEpisodeAlertActionBodySchema.parse({
        action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
        episode_id: 'episode-1',
      })
    ).toThrow();
  });
});

describe('createAckEpisodeActionBodySchema', () => {
  it('accepts an empty body', () => {
    expect(() => createAckEpisodeActionBodySchema.parse({})).not.toThrow();
  });

  it('rejects episode_id in the body (strict)', () => {
    expect(() => createAckEpisodeActionBodySchema.parse({ episode_id: 'episode-1' })).toThrow();
  });
});

describe('seriesAlertActionParamsSchema', () => {
  it('accepts a group_hash and rejects an empty one', () => {
    expect(() => seriesAlertActionParamsSchema.parse({ group_hash: 'group-1' })).not.toThrow();
    expect(() => seriesAlertActionParamsSchema.parse({ group_hash: '' })).toThrow();
  });
});

describe('episodeAlertActionParamsSchema', () => {
  it('accepts an episode_id and rejects an empty one', () => {
    expect(() => episodeAlertActionParamsSchema.parse({ episode_id: 'episode-1' })).not.toThrow();
    expect(() => episodeAlertActionParamsSchema.parse({ episode_id: '' })).toThrow();
  });
});

describe('bulkCreateSeriesAlertActionBodySchema', () => {
  it('accepts a valid bulk item for every series action variant', () => {
    const items = [
      { action_type: ALERT_EPISODE_ACTION_TYPE.TAG, tags: ['p1'], group_hash: 'g1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE, group_hash: 'g1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE, group_hash: 'g1' },
    ];

    expect(() => bulkCreateSeriesAlertActionBodySchema.parse(items)).not.toThrow();
  });

  it('rejects episode-level action types and episode_id keys', () => {
    expect(() =>
      bulkCreateSeriesAlertActionBodySchema.parse([
        { action_type: ALERT_EPISODE_ACTION_TYPE.ACK, group_hash: 'g1' },
      ])
    ).toThrow();
    expect(() =>
      bulkCreateSeriesAlertActionBodySchema.parse([
        {
          action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
          group_hash: 'g1',
          episode_id: 'episode-1',
        },
      ])
    ).toThrow();
  });
});

describe('bulkCreateEpisodeAlertActionBodySchema', () => {
  it('accepts a valid bulk item for every episode action variant', () => {
    const items = [
      { action_type: ALERT_EPISODE_ACTION_TYPE.ACK, episode_id: 'e1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.UNACK, episode_id: 'e1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN, assignee_uid: null, episode_id: 'e1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE, reason: 'reason', episode_id: 'e1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE, reason: 'reason', episode_id: 'e1' },
    ];

    expect(() => bulkCreateEpisodeAlertActionBodySchema.parse(items)).not.toThrow();
  });

  it('requires episode_id on every item', () => {
    expect(() =>
      bulkCreateEpisodeAlertActionBodySchema.parse([{ action_type: ALERT_EPISODE_ACTION_TYPE.ACK }])
    ).toThrow();
  });

  it('rejects series-level action types and group_hash keys', () => {
    expect(() =>
      bulkCreateEpisodeAlertActionBodySchema.parse([
        { action_type: ALERT_EPISODE_ACTION_TYPE.TAG, tags: ['p1'], episode_id: 'e1' },
      ])
    ).toThrow();
    expect(() =>
      bulkCreateEpisodeAlertActionBodySchema.parse([
        {
          action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
          episode_id: 'e1',
          group_hash: 'g1',
        },
      ])
    ).toThrow();
  });
});
