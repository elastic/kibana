/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleResponse } from '../test_utils';
import {
  buildRuleChangedEventData,
  RULE_CHANGED_EVENT,
  RULE_OPERATIONS,
  ruleChangeTelemetryEvents,
} from './rule_changed_event';

describe('RULE_CHANGED_EVENT', () => {
  it('uses an event type distinct from the alerting v1 event', () => {
    expect(RULE_CHANGED_EVENT.eventType).toBe('alerting_v2_rule_changed');
  });

  it('is included in the events registered at setup', () => {
    expect(ruleChangeTelemetryEvents).toEqual([RULE_CHANGED_EVENT]);
  });

  it('covers the rule lifecycle operations', () => {
    expect(RULE_OPERATIONS).toEqual([
      'rule.created',
      'rule.updated',
      'rule.deleted',
      'rule.enabled',
      'rule.disabled',
    ]);
  });
});

describe('buildRuleChangedEventData', () => {
  it('projects the required fields from the rule', () => {
    const rule = createRuleResponse({ id: 'rule-1', kind: 'signal', enabled: false });

    expect(buildRuleChangedEventData(rule, { operation: 'rule.created', channel: 'api' })).toEqual({
      rule_id: 'rule-1',
      operation: 'rule.created',
      created_at: rule.created_at,
      kind: 'signal',
      enabled: false,
      channel: 'api',
    });
  });

  it.each(RULE_OPERATIONS)('includes the %s operation', (operation) => {
    expect(buildRuleChangedEventData(createRuleResponse(), { operation, channel: 'api' })).toEqual(
      expect.objectContaining({ operation })
    );
  });

  it('omits template_id, builder_type, and app when absent', () => {
    const data = buildRuleChangedEventData(createRuleResponse(), {
      operation: 'rule.updated',
      channel: 'api',
    });

    expect(data).not.toHaveProperty('template_id');
    expect(data).not.toHaveProperty('builder_type');
    expect(data).not.toHaveProperty('app');
  });

  it('includes the channel and app', () => {
    expect(
      buildRuleChangedEventData(createRuleResponse(), {
        operation: 'rule.updated',
        channel: 'ui',
        app: 'discover',
      })
    ).toEqual(expect.objectContaining({ channel: 'ui', app: 'discover' }));
  });

  it('includes template_id and builder_type when present', () => {
    const data = buildRuleChangedEventData(
      createRuleResponse({
        metadata: { template: { id: 'template-1' }, builder: { type: 'threshold' } },
      }),
      { operation: 'rule.created', channel: 'api' }
    );

    expect(data).toEqual(
      expect.objectContaining({ template_id: 'template-1', builder_type: 'threshold' })
    );
  });
});
