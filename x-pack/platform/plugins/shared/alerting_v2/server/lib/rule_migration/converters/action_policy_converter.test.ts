/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type { ClassicRuleAction, DefaultActionPolicy } from '../types';
import { convertClassicActions, getMigrationRoutingTag } from './action_policy_converter';

const ROUTING_TAG = getMigrationRoutingTag('classic-1');

const convert = (actions: ClassicRuleAction[], defaultActionPolicy?: DefaultActionPolicy) =>
  convertClassicActions({
    actions,
    ruleName: 'High error count',
    routingTag: ROUTING_TAG,
    defaultActionPolicy,
  });

const emailAction = (overrides: Partial<ClassicRuleAction> = {}): ClassicRuleAction => ({
  uuid: 'action-1',
  id: 'email-connector',
  actionTypeId: '.email',
  group: 'query matched',
  params: {
    to: ['ops@example.com'],
    cc: ['cc@example.com'],
    subject: 'Rule {{rule.name}} fired',
    message: 'Check it',
  },
  ...overrides,
});

describe('getMigrationRoutingTag', () => {
  it('prefixes the classic rule id', () => {
    expect(getMigrationRoutingTag('abc')).toBe('migrated-rule:abc');
  });
});

describe('convertClassicActions', () => {
  it('converts an email action to an email step on the same connector', () => {
    const { actionPolicies, skippedActions } = convert([emailAction()]);

    expect(skippedActions).toEqual([]);
    expect(actionPolicies).toHaveLength(1);
    const [actionPolicy] = actionPolicies;
    expect(actionPolicy).toMatchObject({
      sourceActionId: 'action-1',
      sourceConnectorId: 'email-connector',
      sourceConnectorTypeId: '.email',
      stepType: 'email',
      connectorId: 'email-connector',
      notes: [],
      policy: {
        name: 'High error count · Email',
        matcher: { tags: [ROUTING_TAG] },
      },
    });
    expect(parse(actionPolicy.params)).toEqual({
      to: ['ops@example.com'],
      cc: ['cc@example.com'],
      subject: 'Rule High error count fired',
      message: 'Check it',
    });
  });

  it('replaces templates that use other mustache variables with the rule type default', () => {
    const { actionPolicies } = convert(
      [emailAction({ params: { to: ['a@b.c'], subject: '{{context.title}}', message: 'ok' } })],
      { subject: 'Default subject', message: 'Default message' }
    );

    expect(parse(actionPolicies[0].params)).toMatchObject({
      subject: 'Default subject',
      message: 'ok',
    });
    expect(actionPolicies[0].notes).toEqual(['templates_replaced']);
  });

  it('uses the step default message when the rule type has none', () => {
    const { actionPolicies } = convert([
      emailAction({ params: { to: ['a@b.c'], subject: '', message: '{{context.message}}' } }),
    ]);
    const params = parse(actionPolicies[0].params);

    expect(params.subject).toBe('[High error count] Alert');
    expect(params.message).toContain('inputs.payload.alerts');
  });

  it('maps a Slack v2 action to a Slack step on the same connector', () => {
    const { actionPolicies } = convert([
      {
        id: 'slack2-connector',
        actionTypeId: '.slack2',
        params: { subAction: 'postMessage', subActionParams: { channel: 'C1', text: 'hi' } },
      },
    ]);

    expect(actionPolicies[0]).toMatchObject({
      sourceActionId: 'slack2-connector',
      stepType: 'slack2.sendMessage',
      connectorId: 'slack2-connector',
      notes: [],
      policy: { name: 'High error count · Slack' },
    });
    expect(parse(actionPolicies[0].params)).toEqual({ channel: 'C1', text: 'hi' });
  });

  it('flags a Slack API action as needing a Slack v2 connector', () => {
    const { actionPolicies } = convert([
      {
        id: 'slack-api-connector',
        actionTypeId: '.slack_api',
        params: { subAction: 'postMessage', subActionParams: { channelIds: ['C2'], text: 'hi' } },
      },
    ]);

    expect(actionPolicies[0]).toMatchObject({
      connectorId: null,
      notes: ['connector_required'],
    });
    expect(parse(actionPolicies[0].params)).toEqual({ channel: 'C2', text: 'hi' });
  });

  it('notes dropped alert filters', () => {
    const { actionPolicies } = convert([emailAction({ alertsFilter: { query: { kql: 'x' } } })]);
    expect(actionPolicies[0].notes).toEqual(['alerts_filter_dropped']);
  });

  it('skips unsupported connectors and recovery actions', () => {
    const { actionPolicies, skippedActions } = convert([
      emailAction({ uuid: 'webhook', actionTypeId: '.webhook' }),
      emailAction({ uuid: 'recovery', group: 'recovered' }),
    ]);

    expect(actionPolicies).toEqual([]);
    expect(skippedActions).toEqual([
      { sourceActionId: 'webhook', sourceConnectorTypeId: '.webhook', reason: 'unsupported_connector' },
      { sourceActionId: 'recovery', sourceConnectorTypeId: '.email', reason: 'recovery_group' },
    ]);
  });

  it.each([
    [
      'per alert, every run',
      { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
      { grouping: { mode: 'per_alert' }, throttle: { strategy: 'every_time' } },
    ],
    [
      'per alert, on an interval',
      { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
      {
        grouping: { mode: 'per_alert' },
        throttle: { strategy: 'per_status_interval', interval: '1h' },
      },
    ],
    [
      'per alert, on status change',
      { summary: false, notifyWhen: 'onActionGroupChange', throttle: null },
      { grouping: { mode: 'per_alert' }, throttle: { strategy: 'on_status_change' } },
    ],
    [
      'summary, on an interval',
      { summary: true, notifyWhen: 'onThrottleInterval', throttle: '10m' },
      { grouping: { mode: 'all' }, throttle: { strategy: 'time_interval', interval: '10m' } },
    ],
    [
      'summary, every run',
      { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
      { grouping: { mode: 'all' }, throttle: { strategy: 'every_time' } },
    ],
  ])('maps frequency "%s"', (_, frequency, delivery) => {
    const { actionPolicies } = convert([emailAction({ frequency })]);
    expect(actionPolicies[0].policy).toMatchObject(delivery);
  });

  it('treats a missing frequency as per alert on status change', () => {
    const { actionPolicies } = convert([emailAction()]);
    expect(actionPolicies[0].policy).toMatchObject({
      grouping: { mode: 'per_alert' },
      throttle: { strategy: 'on_status_change' },
    });
  });
});
