/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_ITEMS } from '@kbn/alerting-v2-schemas';
import {
  ALERT_ACTION_EBT_EVENT_TYPES,
  alertActionAppliedTelemetryDataSchema,
  alertActionEbtEventTypeTelemetrySchema,
} from './alert_action_ebt_schema';

describe('alertActionEbtEventTypeTelemetrySchema', () => {
  it.each(ALERT_ACTION_EBT_EVENT_TYPES)('accepts %s', (eventType) => {
    expect(alertActionEbtEventTypeTelemetrySchema.parse(eventType)).toBe(eventType);
  });

  it('rejects an unknown event type', () => {
    expect(
      alertActionEbtEventTypeTelemetrySchema.safeParse('alerting_v2_alert_action_applied').success
    ).toBe(false);
  });
});

describe('alertActionAppliedTelemetryDataSchema', () => {
  const origin = { actor: 'user' as const, channel: 'api' as const };
  const payload = {
    space_id: 'default',
    rule_id: 'rule-1',
    origin,
    alert_count: 1,
  };

  it('accepts space id, rule id, origin, and alert count', () => {
    expect(alertActionAppliedTelemetryDataSchema.parse(payload)).toEqual(payload);
  });

  it('accepts a payload without rule_id', () => {
    const { rule_id: _ruleId, ...withoutRuleId } = payload;

    expect(alertActionAppliedTelemetryDataSchema.parse(withoutRuleId)).toEqual(withoutRuleId);
  });

  it('accepts a lowercase space id and rejects anything else', () => {
    expect(
      alertActionAppliedTelemetryDataSchema.parse({ ...payload, space_id: 'my_space-1' }).space_id
    ).toBe('my_space-1');
    expect(
      alertActionAppliedTelemetryDataSchema.safeParse({ ...payload, space_id: 'My-Space' }).success
    ).toBe(false);
    expect(
      alertActionAppliedTelemetryDataSchema.safeParse({ ...payload, space_id: 'a'.repeat(1025) })
        .success
    ).toBe(false);
  });

  it('accepts an origin app', () => {
    const withApp = { ...payload, origin: { ...origin, app: 'observability' } };

    expect(alertActionAppliedTelemetryDataSchema.parse(withApp)).toEqual(withApp);
  });

  it('rejects a payload without space_id, origin, or alert_count', () => {
    expect(
      alertActionAppliedTelemetryDataSchema.safeParse({ ...payload, space_id: undefined }).success
    ).toBe(false);
    expect(
      alertActionAppliedTelemetryDataSchema.safeParse({ ...payload, origin: undefined }).success
    ).toBe(false);
    expect(
      alertActionAppliedTelemetryDataSchema.safeParse({ ...payload, alert_count: undefined })
        .success
    ).toBe(false);
  });

  it('rejects an origin without an actor', () => {
    expect(
      alertActionAppliedTelemetryDataSchema.safeParse({ ...payload, origin: { channel: 'api' } })
        .success
    ).toBe(false);
  });

  it.each([0, 1.5, MAX_BULK_ITEMS + 1])('rejects alert_count %s', (alertCount) => {
    expect(
      alertActionAppliedTelemetryDataSchema.safeParse({ ...payload, alert_count: alertCount })
        .success
    ).toBe(false);
  });
});
