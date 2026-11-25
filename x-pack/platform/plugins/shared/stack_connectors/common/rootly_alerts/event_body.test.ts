/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionParamsType } from '@kbn/connector-schemas/rootly_alerts';
import { getDedupKey, getEventBody } from './event_body';

describe('getEventBody', () => {
  const trigger: ActionParamsType = {
    event: 'trigger',
    dedupKey: 'rule:alert',
    title: 'Error count is high',
  };

  const emptyKibana = {
    rule_id: '',
    rule_name: '',
    alert_id: '',
    space: '',
    url: '',
    evaluation_time: '',
  };

  it('builds a trigger with only the required params', () => {
    expect(getEventBody(trigger)).toEqual({
      event: 'trigger',
      dedup_key: 'rule:alert',
      title: 'Error count is high',
      kibana: emptyKibana,
    });
  });

  it('builds a trigger with all params', () => {
    expect(
      getEventBody({
        ...trigger,
        description: 'Error count is 42 in the last 5 mins',
        url: 'https://kibana.example.com/app/rules/rule/abc',
        urgency: 'High',
        match: { on: 'service', value: 'checkout-api' },
        labels: [{ key: 'environment', value: 'production' }],
        customDetails: '{"runbook":"https://example.com/runbook"}',
        ruleId: 'abc',
        ruleName: 'Error count',
        alertId: 'checkout-api',
        space: 'default',
        evaluationTime: '2026-11-17T14:02:11Z',
      })
    ).toEqual({
      event: 'trigger',
      dedup_key: 'rule:alert',
      title: 'Error count is high',
      description: 'Error count is 42 in the last 5 mins',
      url: 'https://kibana.example.com/app/rules/rule/abc',
      urgency: 'High',
      service: 'checkout-api',
      labels: { environment: 'production' },
      custom: { runbook: 'https://example.com/runbook' },
      kibana: {
        rule_id: 'abc',
        rule_name: 'Error count',
        alert_id: 'checkout-api',
        space: 'default',
        url: 'https://kibana.example.com/app/rules/rule/abc',
        evaluation_time: '2026-11-17T14:02:11Z',
      },
    });
  });

  it('defaults to a trigger when there is no event', () => {
    expect(getEventBody({ title: 'Test alert' })).toMatchObject({ event: 'trigger' });
  });

  it('sends only the dedup key on a resolve', () => {
    expect(getEventBody({ ...trigger, event: 'resolve', urgency: 'High' })).toEqual({
      event: 'resolve',
      dedup_key: 'rule:alert',
    });
  });

  it.each([
    [{ on: 'service', value: 'checkout-api' }, { service: 'checkout-api' }],
    [{ on: 'team', value: 'sre' }, { team: 'sre' }],
    [{ on: 'functionality', value: 'checkout' }, { functionality: 'checkout' }],
    [{ on: 'catalog', catalog: 'regions', value: 'eu-west' }, { catalogs: { regions: 'eu-west' } }],
    [{ on: 'custom', value: 'tier-1' }, { routing_key: 'tier-1' }],
  ] as Array<[ActionParamsType['match'], Record<string, unknown>]>)(
    'sends the match %j as %j',
    (match, expected) => {
      expect(getEventBody({ ...trigger, match })).toEqual({
        event: 'trigger',
        dedup_key: 'rule:alert',
        title: 'Error count is high',
        ...expected,
        kibana: emptyKibana,
      });
    }
  );

  it('trims values and leaves out the empty ones', () => {
    expect(
      getEventBody({
        ...trigger,
        description: '  ',
        url: '',
        urgency: ' High ',
        match: { on: 'team', value: '  ' },
        labels: [
          { key: ' region ', value: ' us-east-1 ' },
          { key: '', value: 'no name' },
          { key: 'empty', value: '  ' },
        ],
      })
    ).toEqual({
      event: 'trigger',
      dedup_key: 'rule:alert',
      title: 'Error count is high',
      urgency: 'High',
      labels: { region: 'us-east-1' },
      kibana: emptyKibana,
    });
  });

  it('leaves out a catalog value that has no catalog', () => {
    expect(
      getEventBody({ ...trigger, match: { on: 'catalog', value: 'eu-west' } })
    ).not.toHaveProperty('catalogs');
  });

  it.each([
    ['service', 'Service'],
    ['team', 'Group'],
    ['escalation_policy', 'EscalationPolicy'],
    ['user', 'User'],
    ['functionality', 'Functionality'],
  ] as const)('sends a %s target as a Rootly %s', (type, rootlyType) => {
    expect(getEventBody({ ...trigger, target: { type, id: ' abc-123 ' } }).rootly).toEqual({
      notification_target: { type: rootlyType, id: 'abc-123' },
    });
  });

  it('sends a target in place of the routing value', () => {
    const body = getEventBody({
      ...trigger,
      match: { on: 'service', value: 'checkout-api' },
      target: { type: 'escalation_policy', id: 'abc-123' },
    });
    expect(body).toHaveProperty('rootly.notification_target.type', 'EscalationPolicy');
    expect(body).not.toHaveProperty('service');
  });

  it('sends the last value when a label name is repeated', () => {
    const labels = [
      { key: 'env', value: 'staging' },
      { key: 'env', value: 'production' },
    ];
    expect(getEventBody({ ...trigger, labels }).labels).toEqual({ env: 'production' });
  });

  it('sends a label named like an object property', () => {
    const { labels } = getEventBody({ ...trigger, labels: [{ key: '__proto__', value: 'x' }] });
    expect(Object.entries(labels as object)).toEqual([['__proto__', 'x']]);
  });
});

describe('getDedupKey', () => {
  it('uses the key that is set', () => {
    expect(getDedupKey({ dedupKey: ' my-key ', ruleId: 'rule', alertId: 'alert' })).toBe('my-key');
  });

  it('uses the rule and alert IDs when the key is empty', () => {
    expect(getDedupKey({ dedupKey: ' ', ruleId: 'rule', alertId: 'alert' })).toBe('rule:alert');
  });

  it('returns nothing when there is no key and no rule', () => {
    expect(getDedupKey({})).toBeUndefined();
    expect(getDedupKey({ ruleId: 'rule' })).toBeUndefined();
  });
});
