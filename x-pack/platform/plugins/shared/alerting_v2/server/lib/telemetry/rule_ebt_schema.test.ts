/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_EBT_EVENT_TYPES,
  ruleEbtEventTypeTelemetrySchema,
  ruleChangedTelemetryDataSchema,
} from './rule_ebt_schema';

describe('ruleEbtEventTypeTelemetrySchema', () => {
  it.each(RULE_EBT_EVENT_TYPES)('accepts %s', (eventType) => {
    expect(ruleEbtEventTypeTelemetrySchema.parse(eventType)).toBe(eventType);
  });

  it('rejects an unknown event type', () => {
    expect(ruleEbtEventTypeTelemetrySchema.safeParse('alerting_v2_rule_changed').success).toBe(
      false
    );
  });
});

describe('ruleChangedTelemetryDataSchema', () => {
  const origin = { actor: 'user' as const, channel: 'api' as const };

  it('accepts rule id and origin when the domain rule is absent', () => {
    expect(ruleChangedTelemetryDataSchema.parse({ rule_id: 'rule-1', origin })).toEqual({
      rule_id: 'rule-1',
      origin,
    });
  });

  it('accepts the rule fields when they are present', () => {
    const data = {
      rule_id: 'rule-1',
      template_id: 'template-1',
      created_at: '2026-10-12T22:05:11.352Z',
      kind: 'alert' as const,
      builder_type: 'threshold',
      enabled: true,
      origin: { ...origin, app: 'discover' },
    };

    expect(ruleChangedTelemetryDataSchema.parse(data)).toEqual(data);
  });

  it('rejects an origin without an actor', () => {
    expect(
      ruleChangedTelemetryDataSchema.safeParse({ rule_id: 'rule-1', origin: { channel: 'api' } })
        .success
    ).toBe(false);
  });
});
