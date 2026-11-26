/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { EventOrigin } from '../event_origin/origin_schemas';
import {
  actionPolicyChangedTelemetryDataSchema,
  type ActionPolicyEbtMatcherType,
} from './action_policy_ebt_schema';
import {
  ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION,
  ACTION_POLICY_OPERATIONS,
  actionPolicyChangeTelemetryEvents,
  buildActionPolicyChangedEventData,
} from './action_policy_ebt_event';

const apiUserOrigin: EventOrigin = { actor: 'user', channel: 'api' };
const POLICY_ID = 'policy-1';
const SPACE_ID = 'space-1';

const createActionPolicyResponse = (
  overrides: Partial<ActionPolicyResponse> = {}
): ActionPolicyResponse => ({
  id: 'policy-1',
  name: 'Sensitive policy name',
  description: 'Sensitive description',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
  created_by: { profile_uid: 'creator' },
  created_at: '2025-01-01T00:00:00.000Z',
  updated_by: { profile_uid: 'updater' },
  updated_at: '2025-01-02T00:00:00.000Z',
  ...overrides,
});

describe('action policy change EBT events', () => {
  it('registers one event type per operation', () => {
    expect(actionPolicyChangeTelemetryEvents.map((event) => event.eventType)).toEqual([
      'alerting_v2_action_policy_created',
      'alerting_v2_action_policy_updated',
      'alerting_v2_action_policy_deleted',
      'alerting_v2_action_policy_enabled',
      'alerting_v2_action_policy_disabled',
    ]);
  });

  it('shares one payload schema across every event type', () => {
    const [first, ...rest] = actionPolicyChangeTelemetryEvents;
    for (const event of rest) {
      expect(event.schema).toBe(first?.schema);
    }
  });

  it('reports the action policy domain events', () => {
    expect(ACTION_POLICY_OPERATIONS).toEqual([
      'action_policy.created',
      'action_policy.updated',
      'action_policy.deleted',
      'action_policy.enabled',
      'action_policy.disabled',
    ]);
  });

  it('maps each operation to its event type', () => {
    expect(
      ACTION_POLICY_OPERATIONS.map((op) => ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION[op])
    ).toEqual(actionPolicyChangeTelemetryEvents.map((event) => event.eventType));
  });

  it('declares every payload field in the registered schema', () => {
    const [{ schema }] = actionPolicyChangeTelemetryEvents;
    const data = buildActionPolicyChangedEventData(
      createActionPolicyResponse({
        grouping: { mode: 'per_alert' },
        throttle: { strategy: 'every_time' },
      }),
      apiUserOrigin,
      POLICY_ID,
      SPACE_ID
    );

    expect(Object.keys(schema).sort()).toEqual(Object.keys(data).sort());
  });
});

describe('buildActionPolicyChangedEventData', () => {
  it('projects the policy fields and nests the origin', () => {
    expect(
      buildActionPolicyChangedEventData(
        createActionPolicyResponse(),
        apiUserOrigin,
        POLICY_ID,
        SPACE_ID
      )
    ).toEqual({
      action_policy_id: 'policy-1',
      space_id: SPACE_ID,
      created_at: '2025-01-01T00:00:00.000Z',
      enabled: true,
      destination_count: 1,
      matcher_type: 'none',
      snoozed: false,
      origin: { actor: 'user', channel: 'api' },
    });
  });

  it('produces a payload that satisfies the shared schema', () => {
    const data = buildActionPolicyChangedEventData(
      createActionPolicyResponse({
        matcher: { tags: ['prod'], expression: 'severity: critical' },
        grouping: { mode: 'per_field', fields: ['host.name'] },
        throttle: { strategy: 'time_interval', interval: '1h' },
        snoozed_until: '2030-01-01T00:00:00.000Z',
      }),
      { actor: 'internal', channel: 'ui', app: 'discover' },
      POLICY_ID,
      SPACE_ID
    );

    expect(actionPolicyChangedTelemetryDataSchema.safeParse(data).success).toBe(true);
  });

  it.each<[string, ActionPolicyResponse['matcher'], ActionPolicyEbtMatcherType]>([
    ['no matcher', undefined, 'none'],
    ['tags only', { tags: ['prod'] }, 'tags'],
    ['expression only', { expression: 'severity: critical' }, 'expression'],
    ['empty tags and a blank expression', { tags: [], expression: '   ' }, 'none'],
    ['tags and a blank expression', { tags: ['prod'], expression: '   ' }, 'tags'],
    [
      'tags and expression',
      { tags: ['prod'], expression: 'severity: critical' },
      'tags_and_expression',
    ],
  ])('derives matcher_type for %s', (_description, matcher, expected) => {
    const policy = createActionPolicyResponse({ matcher });

    expect(
      buildActionPolicyChangedEventData(policy, apiUserOrigin, POLICY_ID, SPACE_ID).matcher_type
    ).toBe(expected);
  });

  it('reports grouping_mode only when grouping is set', () => {
    const grouped = createActionPolicyResponse({ grouping: { mode: 'all' } });

    expect(
      buildActionPolicyChangedEventData(grouped, apiUserOrigin, POLICY_ID, SPACE_ID).grouping_mode
    ).toBe('all');
    expect(
      buildActionPolicyChangedEventData(
        createActionPolicyResponse(),
        apiUserOrigin,
        POLICY_ID,
        SPACE_ID
      )
    ).not.toHaveProperty('grouping_mode');
  });

  it('reports throttle_strategy only when a throttle is set', () => {
    const throttled = createActionPolicyResponse({
      throttle: { strategy: 'per_status_interval', interval: '5m' },
    });

    expect(
      buildActionPolicyChangedEventData(throttled, apiUserOrigin, POLICY_ID, SPACE_ID)
        .throttle_strategy
    ).toBe('per_status_interval');
    expect(
      buildActionPolicyChangedEventData(
        createActionPolicyResponse(),
        apiUserOrigin,
        POLICY_ID,
        SPACE_ID
      )
    ).not.toHaveProperty('throttle_strategy');
  });

  describe('snoozed', () => {
    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it.each<[string, ActionPolicyResponse['snoozed_until'], boolean]>([
      ['is true when snoozed_until is in the future', '2026-06-01T00:00:00.001Z', true],
      ['is false when snoozed_until has expired', '2026-05-31T23:59:59.999Z', false],
      ['is false when snoozed_until is now', '2026-06-01T00:00:00.000Z', false],
      ['is false when snoozed_until is absent', undefined, false],
    ])('%s', (_description, snoozedUntil, expected) => {
      const policy = createActionPolicyResponse({ snoozed_until: snoozedUntil });

      expect(
        buildActionPolicyChangedEventData(policy, apiUserOrigin, POLICY_ID, SPACE_ID).snoozed
      ).toBe(expected);
    });
  });

  it('counts the destinations', () => {
    const policy = createActionPolicyResponse({
      destinations: [
        { type: 'workflow', id: 'workflow-1' },
        { type: 'workflow', id: 'workflow-2' },
        { type: 'workflow', id: 'workflow-3' },
      ],
    });

    expect(
      buildActionPolicyChangedEventData(policy, apiUserOrigin, POLICY_ID, SPACE_ID)
        .destination_count
    ).toBe(3);
  });

  it('reports only the id, space and origin when the policy is missing', () => {
    const data = buildActionPolicyChangedEventData(undefined, apiUserOrigin, POLICY_ID, SPACE_ID);

    expect(data).toEqual({
      action_policy_id: POLICY_ID,
      space_id: SPACE_ID,
      origin: apiUserOrigin,
    });
    expect(actionPolicyChangedTelemetryDataSchema.safeParse(data).success).toBe(true);
  });

  it('reports the origin as given', () => {
    const policy = createActionPolicyResponse();

    expect(
      buildActionPolicyChangedEventData(
        policy,
        { actor: 'user', channel: 'ui', app: 'discover' },
        POLICY_ID,
        SPACE_ID
      ).origin
    ).toEqual({ actor: 'user', channel: 'ui', app: 'discover' });
  });

  it('does not report names, descriptions, matcher contents, grouping fields, destinations or actors', () => {
    const policy = createActionPolicyResponse({
      matcher: { tags: ['secret-tag'], expression: 'secret: expression' },
      grouping: { mode: 'per_field', fields: ['secret.field'] },
    });
    const serialized = JSON.stringify(
      buildActionPolicyChangedEventData(policy, apiUserOrigin, POLICY_ID, SPACE_ID)
    );

    for (const value of [
      'Sensitive policy name',
      'Sensitive description',
      'secret-tag',
      'secret: expression',
      'secret.field',
      'workflow-1',
      'creator',
      'updater',
    ]) {
      expect(serialized).not.toContain(value);
    }
  });
});
