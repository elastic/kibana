/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACTION_POLICY_EBT_EVENT_TYPES,
  actionPolicyChangedTelemetryDataSchema,
  actionPolicyEbtEventTypeTelemetrySchema,
} from './action_policy_ebt_schema';

const validPayload = {
  action_policy_id: 'policy-1',
  space_id: 'default',
  created_at: '2025-01-01T00:00:00.000Z',
  enabled: true,
  destination_count: 2,
  matcher_type: 'tags_and_expression',
  grouping_mode: 'per_field',
  throttle_strategy: 'time_interval',
  snoozed: false,
  origin: { actor: 'user', channel: 'ui', app: 'discover' },
} as const;

describe('actionPolicyEbtEventTypeTelemetrySchema', () => {
  it.each(ACTION_POLICY_EBT_EVENT_TYPES)('accepts %s', (eventType) => {
    expect(actionPolicyEbtEventTypeTelemetrySchema.parse(eventType)).toBe(eventType);
  });

  it('rejects an unknown event type', () => {
    expect(
      actionPolicyEbtEventTypeTelemetrySchema.safeParse('alerting_v2_action_policy_changed').success
    ).toBe(false);
  });
});

describe('actionPolicyChangedTelemetryDataSchema', () => {
  it('accepts a full payload', () => {
    expect(actionPolicyChangedTelemetryDataSchema.parse(validPayload)).toEqual(validPayload);
  });

  it('accepts a payload without grouping_mode, throttle_strategy and origin.app', () => {
    const { grouping_mode: _grouping, throttle_strategy: _throttle, ...rest } = validPayload;

    expect(
      actionPolicyChangedTelemetryDataSchema.safeParse({
        ...rest,
        origin: { actor: 'user', channel: 'api' },
      }).success
    ).toBe(true);
  });

  it('accepts a payload with only action_policy_id, space_id and origin', () => {
    const { action_policy_id: actionPolicyId, space_id: spaceId, origin } = validPayload;

    expect(
      actionPolicyChangedTelemetryDataSchema.safeParse({
        action_policy_id: actionPolicyId,
        space_id: spaceId,
        origin,
      }).success
    ).toBe(true);
  });

  it.each([
    ['an unknown matcher_type', { matcher_type: 'regex' }],
    ['an unknown grouping_mode', { grouping_mode: 'per_host' }],
    ['a negative destination_count', { destination_count: -1 }],
    ['a non-integer destination_count', { destination_count: 1.5 }],
    ['an empty action_policy_id', { action_policy_id: '' }],
    ['an empty space_id', { space_id: '' }],
    ['an unknown channel', { origin: { actor: 'user', channel: 'cli' } }],
  ])('rejects %s', (_description, overrides) => {
    expect(
      actionPolicyChangedTelemetryDataSchema.safeParse({ ...validPayload, ...overrides }).success
    ).toBe(false);
  });
});
