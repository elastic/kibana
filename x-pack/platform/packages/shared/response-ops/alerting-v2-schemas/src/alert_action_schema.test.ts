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
  createSnoozeAlertActionBodySchema,
} from './alert_action_schema';

describe('createSnoozeAlertActionBodySchema', () => {
  it('accepts an empty body (indefinite, unconditional snooze)', () => {
    expect(createSnoozeAlertActionBodySchema.safeParse({}).success).toBe(true);
  });

  it('accepts an expiry only', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      expiry: '2026-05-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts eq and changed conditions with a match combinator', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [
        { field: 'data.host.name', operator: 'changed' },
        { field: 'severity', operator: 'changed' },
        { field: 'severity', operator: 'eq', value: 'critical' },
      ],
      match: 'all',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an eq value outside the supported severity levels', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ field: 'severity', operator: 'eq', value: 'warning' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an eq condition on a non-watchable field', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ field: 'data.host.name', operator: 'eq', value: 'critical' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown match combinator', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ field: 'severity', operator: 'changed' }],
      match: 'some',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a changed condition without a field', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ operator: 'changed' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a changed condition on a field outside severity and data.*', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ field: 'host.name', operator: 'changed' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown operator', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ field: 'severity', operator: 'gte', value: 'high' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level properties (strict body)', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({ unexpected: true });
    expect(result.success).toBe(false);
  });
});

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
      {
        action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
        conditions: [{ field: 'severity', operator: 'eq', value: 'critical' }],
        match: 'any',
        group_hash: 'g1',
      },
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
