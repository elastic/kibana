/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { RuleChangedEventOrigin } from '../event_origin/origin_schemas';
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

const apiUserOrigin: RuleChangedEventOrigin = { actor: 'user', channel: 'api' };

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

  it('maps each operation to its event type', () => {
    expect(
      ACTION_POLICY_OPERATIONS.map((op) => ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION[op])
    ).toEqual(actionPolicyChangeTelemetryEvents.map((event) => event.eventType));
  });

  it('declares every payload field in the registered schema', () => {
    const [{ schema }] = actionPolicyChangeTelemetryEvents;
    const data = buildActionPolicyChangedEventData(
      createActionPolicyResponse({ throttle: { strategy: 'every_time' } }),
      apiUserOrigin
    );

    expect(Object.keys(schema).sort()).toEqual(Object.keys(data).sort());
  });
});

describe('buildActionPolicyChangedEventData', () => {
  it('projects the policy fields and nests the origin', () => {
    expect(buildActionPolicyChangedEventData(createActionPolicyResponse(), apiUserOrigin)).toEqual({
      action_policy_id: 'policy-1',
      created_at: '2025-01-01T00:00:00.000Z',
      enabled: true,
      destination_count: 1,
      matcher_type: 'none',
      grouping_mode: 'per_alert',
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
      { actor: 'internal', channel: 'ui', app: 'discover' }
    );

    expect(actionPolicyChangedTelemetryDataSchema.safeParse(data).success).toBe(true);
  });

  it.each<[string, ActionPolicyResponse['matcher'], ActionPolicyEbtMatcherType]>([
    ['no matcher', undefined, 'none'],
    ['tags only', { tags: ['prod'] }, 'tags'],
    ['expression only', { expression: 'severity: critical' }, 'expression'],
    [
      'tags and expression',
      { tags: ['prod'], expression: 'severity: critical' },
      'tags_and_expression',
    ],
  ])('derives matcher_type for %s', (_description, matcher, expected) => {
    const policy = createActionPolicyResponse({ matcher });

    expect(buildActionPolicyChangedEventData(policy, apiUserOrigin).matcher_type).toBe(expected);
  });

  it('reports grouping.mode and defaults to per_alert when no grouping is set', () => {
    const grouped = createActionPolicyResponse({ grouping: { mode: 'all' } });

    expect(buildActionPolicyChangedEventData(grouped, apiUserOrigin).grouping_mode).toBe('all');
    expect(
      buildActionPolicyChangedEventData(createActionPolicyResponse(), apiUserOrigin).grouping_mode
    ).toBe('per_alert');
  });

  it('reports throttle_strategy only when a throttle is set', () => {
    const throttled = createActionPolicyResponse({
      throttle: { strategy: 'per_status_interval', interval: '5m' },
    });

    expect(buildActionPolicyChangedEventData(throttled, apiUserOrigin).throttle_strategy).toBe(
      'per_status_interval'
    );
    expect(
      buildActionPolicyChangedEventData(createActionPolicyResponse(), apiUserOrigin)
    ).not.toHaveProperty('throttle_strategy');
  });

  it('reports snoozed when snoozed_until is present', () => {
    const snoozed = createActionPolicyResponse({ snoozed_until: '2030-01-01T00:00:00.000Z' });

    expect(buildActionPolicyChangedEventData(snoozed, apiUserOrigin).snoozed).toBe(true);
  });

  it('counts the destinations', () => {
    const policy = createActionPolicyResponse({
      destinations: [
        { type: 'workflow', id: 'workflow-1' },
        { type: 'workflow', id: 'workflow-2' },
        { type: 'workflow', id: 'workflow-3' },
      ],
    });

    expect(buildActionPolicyChangedEventData(policy, apiUserOrigin).destination_count).toBe(3);
  });

  it('omits origin.app when it is empty and keeps it when set', () => {
    const policy = createActionPolicyResponse();

    expect(
      buildActionPolicyChangedEventData(policy, { ...apiUserOrigin, app: '' }).origin
    ).not.toHaveProperty('app');
    expect(
      buildActionPolicyChangedEventData(policy, { actor: 'user', channel: 'ui', app: 'discover' })
        .origin
    ).toEqual({ actor: 'user', channel: 'ui', app: 'discover' });
  });

  it('does not report names, descriptions, matcher contents, grouping fields, destinations or actors', () => {
    const policy = createActionPolicyResponse({
      matcher: { tags: ['secret-tag'], expression: 'secret: expression' },
      grouping: { mode: 'per_field', fields: ['secret.field'] },
    });
    const serialized = JSON.stringify(buildActionPolicyChangedEventData(policy, apiUserOrigin));

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
