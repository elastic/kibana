/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  bulkCreateAlertActionBodySchema,
  createAlertActionBodySchema,
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
