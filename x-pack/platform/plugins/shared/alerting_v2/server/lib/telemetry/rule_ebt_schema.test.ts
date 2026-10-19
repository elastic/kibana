/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_EVENT_APP_MAX_LENGTH } from './rule_ebt_schema';
import {
  RULE_EBT_EVENT_TYPES,
  ruleChangedEventOriginTelemetrySchema,
  ruleChangedTelemetryDataSchema,
  ruleEbtEventTypeTelemetrySchema,
  ruleEventAppTelemetrySchema,
  ruleEventOriginTelemetrySchema,
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

describe('ruleEventAppTelemetrySchema', () => {
  it.each(['discover', 'observabilityAlerting', 'agent_builder', 'app.name:id'])(
    'accepts %s',
    (app) => {
      expect(ruleEventAppTelemetrySchema.parse(app)).toBe(app);
    }
  );

  it('accepts an app id at the length bound', () => {
    const app = 'a'.repeat(RULE_EVENT_APP_MAX_LENGTH);
    expect(ruleEventAppTelemetrySchema.parse(app)).toBe(app);
  });

  it.each([
    ['is empty', ''],
    ['contains a space', 'my app'],
    ['contains a slash', 'discover/app'],
    ['is longer than the bound', 'a'.repeat(RULE_EVENT_APP_MAX_LENGTH + 1)],
  ])('rejects an app that %s', (_description, app) => {
    expect(ruleEventAppTelemetrySchema.safeParse(app).success).toBe(false);
  });
});

describe('ruleEventOriginTelemetrySchema', () => {
  it('accepts a channel without an app', () => {
    expect(ruleEventOriginTelemetrySchema.parse({ channel: 'api' })).toEqual({ channel: 'api' });
  });

  it('accepts a bounded app', () => {
    expect(ruleEventOriginTelemetrySchema.parse({ channel: 'ui', app: 'discover' })).toEqual({
      channel: 'ui',
      app: 'discover',
    });
  });

  it('rejects an app outside the bound', () => {
    expect(
      ruleEventOriginTelemetrySchema.safeParse({ channel: 'ui', app: 'not an app' }).success
    ).toBe(false);
  });
});

describe('ruleChangedEventOriginTelemetrySchema', () => {
  it('requires an actor and a channel', () => {
    expect(ruleChangedEventOriginTelemetrySchema.parse({ actor: 'user', channel: 'api' })).toEqual({
      actor: 'user',
      channel: 'api',
    });
  });

  it('accepts a bounded app', () => {
    expect(
      ruleChangedEventOriginTelemetrySchema.parse({
        actor: 'internal',
        channel: 'ui',
        app: 'discover',
      })
    ).toEqual({ actor: 'internal', channel: 'ui', app: 'discover' });
  });

  it('rejects an unknown actor', () => {
    expect(
      ruleChangedEventOriginTelemetrySchema.safeParse({ actor: 'system', channel: 'api' }).success
    ).toBe(false);
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
