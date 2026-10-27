/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventOrigin } from '../../event_origin/origin_schemas';
import type { RuleEventPayload } from '../../events/rule_event_publisher/events';
import { createRuleResponse } from '../../test_utils';
import {
  buildRuleChangedEventData,
  RULE_EBT_EVENT_TYPE_BY_OPERATION,
  RULE_OPERATIONS,
  ruleChangeTelemetryEvents,
} from './rule_ebt_event';

const apiUserOrigin: EventOrigin = { actor: 'user', channel: 'api' };

describe('rule change EBT events', () => {
  it('registers one event type per lifecycle operation', () => {
    expect(ruleChangeTelemetryEvents.map((event) => event.eventType)).toEqual([
      'alerting_v2_rule_created',
      'alerting_v2_rule_updated',
      'alerting_v2_rule_deleted',
      'alerting_v2_rule_enabled',
      'alerting_v2_rule_disabled',
    ]);
  });

  it('shares one payload schema across every event type', () => {
    const [first, ...rest] = ruleChangeTelemetryEvents;
    for (const event of rest) {
      expect(event.schema).toBe(first?.schema);
    }
  });

  it('maps each domain operation to its event type', () => {
    expect(RULE_EBT_EVENT_TYPE_BY_OPERATION).toEqual({
      'rule.created': 'alerting_v2_rule_created',
      'rule.updated': 'alerting_v2_rule_updated',
      'rule.deleted': 'alerting_v2_rule_deleted',
      'rule.enabled': 'alerting_v2_rule_enabled',
      'rule.disabled': 'alerting_v2_rule_disabled',
    });
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
  const payloadFor = (rule = createRuleResponse()): RuleEventPayload => ({
    ruleId: rule.id,
    spaceId: 'default',
    rule,
  });

  it('projects the required fields from the rule', () => {
    const rule = createRuleResponse({ id: 'rule-1', kind: 'signal', enabled: false });

    expect(buildRuleChangedEventData('rule.created', payloadFor(rule), apiUserOrigin)).toEqual({
      rule_id: 'rule-1',
      created_at: rule.created_at,
      kind: 'signal',
      enabled: false,
      origin: { actor: 'user', channel: 'api' },
    });
  });

  it('omits template_id, builder_type, and origin.app when absent', () => {
    const data = buildRuleChangedEventData('rule.created', payloadFor(), apiUserOrigin);

    expect(data).not.toHaveProperty('operation');
    expect(data).not.toHaveProperty('template_id');
    expect(data).not.toHaveProperty('builder_type');
    expect(data.origin).not.toHaveProperty('app');
  });

  it('nests the actor, channel, and app under origin', () => {
    expect(
      buildRuleChangedEventData('rule.created', payloadFor(), {
        actor: 'internal',
        channel: 'ui',
        app: 'discover',
      }).origin
    ).toEqual({ actor: 'internal', channel: 'ui', app: 'discover' });
  });

  it('reports only rule_id and origin when the domain rule is missing', () => {
    expect(
      buildRuleChangedEventData(
        'rule.deleted',
        { ruleId: 'rule-1', spaceId: 'default' },
        apiUserOrigin
      )
    ).toEqual({
      rule_id: 'rule-1',
      origin: { actor: 'user', channel: 'api' },
    });
  });

  it('includes updated_fields on rule.updated', () => {
    const data = buildRuleChangedEventData(
      'rule.updated',
      { ...payloadFor(), updatedFields: ['metadata.name', 'schedule'] },
      apiUserOrigin
    );

    expect(data.updated_fields).toEqual(['metadata.name', 'schedule']);
  });

  it.each(['rule.created', 'rule.deleted', 'rule.enabled', 'rule.disabled'] as const)(
    'omits updated_fields on %s',
    (operation) => {
      expect(
        buildRuleChangedEventData(
          operation,
          { ...payloadFor(), updatedFields: ['metadata.name'] },
          apiUserOrigin
        )
      ).not.toHaveProperty('updated_fields');
    }
  );

  it('omits updated_fields when the list is absent or empty', () => {
    expect(
      buildRuleChangedEventData('rule.updated', payloadFor(), apiUserOrigin)
    ).not.toHaveProperty('updated_fields');
    expect(
      buildRuleChangedEventData(
        'rule.updated',
        { ...payloadFor(), updatedFields: [] },
        apiUserOrigin
      )
    ).not.toHaveProperty('updated_fields');
  });

  it('includes template_id and builder_type when present', () => {
    const rule = createRuleResponse({
      metadata: { builder: { type: 'threshold' } },
    });
    const data = buildRuleChangedEventData(
      'rule.created',
      { ...payloadFor(rule), templateId: 'template-1' },
      apiUserOrigin
    );

    expect(data).toEqual(
      expect.objectContaining({ template_id: 'template-1', builder_type: 'threshold' })
    );
  });
});
