/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleResponse } from '../test_utils';
import {
  buildRuleCreatedEventData,
  RULE_CREATED_EVENT,
  ruleCreateTelemetryEvents,
} from './rule_created_event';

describe('RULE_CREATED_EVENT', () => {
  it('uses an event type distinct from the alerting v1 event', () => {
    expect(RULE_CREATED_EVENT.eventType).toBe('alerting_v2_rule_created');
  });

  it('is included in the events registered at setup', () => {
    expect(ruleCreateTelemetryEvents).toEqual([RULE_CREATED_EVENT]);
  });
});

describe('buildRuleCreatedEventData', () => {
  it('projects the required fields from the rule', () => {
    const rule = createRuleResponse({ id: 'rule-1', kind: 'signal', enabled: false });

    expect(buildRuleCreatedEventData(rule)).toEqual({
      rule_id: 'rule-1',
      created_at: rule.created_at,
      kind: 'signal',
      enabled: false,
    });
  });

  it('omits template_id and builder_type when absent', () => {
    const data = buildRuleCreatedEventData(createRuleResponse());

    expect(data).not.toHaveProperty('template_id');
    expect(data).not.toHaveProperty('builder_type');
  });

  it('includes template_id and builder_type when present', () => {
    const data = buildRuleCreatedEventData(
      createRuleResponse({
        metadata: { template: { id: 'template-1' }, builder: { type: 'threshold' } },
      })
    );

    expect(data).toEqual(
      expect.objectContaining({ template_id: 'template-1', builder_type: 'threshold' })
    );
  });
});
