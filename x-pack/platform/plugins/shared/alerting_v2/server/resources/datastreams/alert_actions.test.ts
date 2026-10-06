/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertActionSchema, getAlertActionsResourceDefinition } from './alert_actions';

const baseAction = {
  '@timestamp': '2026-07-01T12:00:00.000Z',
  group_hash: 'group-1',
  last_series_event_timestamp: '2026-07-01T11:59:00.000Z',
  action_type: 'ack',
  rule_id: 'rule-1',
  space_id: 'default',
};

describe('alertActionSchema', () => {
  it('validates a user action with a profile uid', () => {
    const result = alertActionSchema.safeParse({
      ...baseAction,
      actor: { type: 'user', profile_uid: 'u_profile_1' },
    });

    expect(result.success).toBe(true);
  });

  it('validates a user action without a profile uid', () => {
    const result = alertActionSchema.safeParse({ ...baseAction, actor: { type: 'user' } });

    expect(result.success).toBe(true);
  });

  it('validates an internal action', () => {
    const result = alertActionSchema.safeParse({ ...baseAction, actor: { type: 'internal' } });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown actor type', () => {
    const result = alertActionSchema.safeParse({ ...baseAction, actor: { type: 'robot' } });

    expect(result.success).toBe(false);
  });
});

describe('getAlertActionsResourceDefinition', () => {
  it('maps actor as an object with type and profile_uid keywords', () => {
    const { mappings } = getAlertActionsResourceDefinition();

    expect(mappings.properties?.actor).toEqual({
      type: 'object',
      properties: {
        type: { type: 'keyword' },
        profile_uid: { type: 'keyword' },
      },
    });
  });

  it('resets data streams created with the keyword actor mapping', () => {
    const { version, forceReset } = getAlertActionsResourceDefinition();

    expect(version).toBe(7);
    expect(forceReset).toEqual({ version: 6 });
  });
});
