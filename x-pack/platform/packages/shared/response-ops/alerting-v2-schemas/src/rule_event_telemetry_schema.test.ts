/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_EVENT_APP_MAX_LENGTH } from './constants';
import {
  ruleEventAppTelemetrySchema,
  ruleEventOriginTelemetrySchema,
} from './rule_event_telemetry_schema';

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
