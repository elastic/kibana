/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  bulkActivateEpisodeActionBodySchema,
  bulkAssignEpisodeActionBodySchema,
  bulkSnoozeSeriesActionBodySchema,
  bulkTagEpisodeActionBodySchema,
  createAckEpisodeActionBodySchema,
  createEpisodeAlertActionBodySchema,
  createSeriesAlertActionBodySchema,
  episodeAlertActionParamsSchema,
  seriesAlertActionParamsSchema,
} from './alert_action_schema';

const GROUP_HASH = 'a'.repeat(64);
const OTHER_GROUP_HASH = 'b'.repeat(64);

describe('createSeriesAlertActionBodySchema', () => {
  it('accepts every series-level action variant', () => {
    const variants = [
      { action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE, snoozed_until: '2026-08-12T00:00:00.000Z' },
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
        action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
        tags: ['p1'],
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
      { action_type: ALERT_EPISODE_ACTION_TYPE.TAG, tags: ['p1'] },
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
        action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
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
    expect(() => seriesAlertActionParamsSchema.parse({ group_hash: GROUP_HASH })).not.toThrow();
    expect(() => seriesAlertActionParamsSchema.parse({ group_hash: '' })).toThrow();
  });

  it('rejects anything that is not a sha256 digest', () => {
    expect(() => seriesAlertActionParamsSchema.parse({ group_hash: 'group-1' })).toThrow();
    expect(() => seriesAlertActionParamsSchema.parse({ group_hash: 'a'.repeat(63) })).toThrow();
    expect(() => seriesAlertActionParamsSchema.parse({ group_hash: 'a'.repeat(65) })).toThrow();
    expect(() =>
      seriesAlertActionParamsSchema.parse({ group_hash: GROUP_HASH.toUpperCase() })
    ).toThrow();
  });

  it('rejects unknown keys (strict mode)', () => {
    expect(() =>
      seriesAlertActionParamsSchema.parse({ group_hash: GROUP_HASH, foo: 'bar' })
    ).toThrow();
  });
});

describe('episodeAlertActionParamsSchema', () => {
  it('accepts an episode_id and rejects an empty one', () => {
    expect(() => episodeAlertActionParamsSchema.parse({ episode_id: 'episode-1' })).not.toThrow();
    expect(() => episodeAlertActionParamsSchema.parse({ episode_id: '' })).toThrow();
  });

  it('rejects unknown keys (strict mode)', () => {
    expect(() =>
      episodeAlertActionParamsSchema.parse({ episode_id: 'episode-1', foo: 'bar' })
    ).toThrow();
  });
});

describe('verb-specific bulk action body schemas', () => {
  it('accepts a valid bulk tag episode envelope', () => {
    expect(() =>
      bulkTagEpisodeActionBodySchema.parse({ items: [{ episode_id: 'e1', tags: ['p1'] }] })
    ).not.toThrow();
  });

  it('accepts a valid bulk snooze series envelope', () => {
    expect(() =>
      bulkSnoozeSeriesActionBodySchema.parse({
        items: [
          { group_hash: GROUP_HASH, snoozed_until: '2026-08-12T00:00:00.000Z' },
          { group_hash: OTHER_GROUP_HASH },
        ],
      })
    ).not.toThrow();
  });

  it('accepts a valid bulk assign episode envelope', () => {
    expect(() =>
      bulkAssignEpisodeActionBodySchema.parse({
        items: [{ episode_id: 'e1', assignee_uid: null }],
      })
    ).not.toThrow();
  });

  it('accepts a valid bulk activate episode envelope', () => {
    expect(() =>
      bulkActivateEpisodeActionBodySchema.parse({
        items: [{ episode_id: 'e1', reason: 'reopen' }],
      })
    ).not.toThrow();
  });

  it('rejects a bare array body (items envelope is required)', () => {
    expect(() =>
      bulkTagEpisodeActionBodySchema.parse([{ episode_id: 'e1', tags: ['p1'] }])
    ).toThrow();
  });

  it('rejects an empty items list', () => {
    expect(() => bulkTagEpisodeActionBodySchema.parse({ items: [] })).toThrow();
  });

  it('rejects an unknown envelope field (strict mode)', () => {
    expect(() =>
      bulkTagEpisodeActionBodySchema.parse({
        items: [{ episode_id: 'e1', tags: ['p1'] }],
        force: true,
      })
    ).toThrow();
  });

  it('rejects an item carrying action_type (strict mode, the verb is in the path)', () => {
    expect(() =>
      bulkTagEpisodeActionBodySchema.parse({
        items: [{ episode_id: 'e1', tags: ['p1'], action_type: ALERT_EPISODE_ACTION_TYPE.TAG }],
      })
    ).toThrow();
  });

  it('rejects an episode item keyed by group_hash', () => {
    expect(() =>
      bulkTagEpisodeActionBodySchema.parse({ items: [{ group_hash: GROUP_HASH, tags: ['p1'] }] })
    ).toThrow();
    expect(() =>
      bulkAssignEpisodeActionBodySchema.parse({
        items: [{ group_hash: GROUP_HASH, assignee_uid: null }],
      })
    ).toThrow();
  });
});
