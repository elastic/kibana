/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_EVENT_APP_MAX_LENGTH,
  ruleChangedEventOriginSchema,
  ruleEventAppSchema,
  ruleEventOriginSchema,
} from './origin_schemas';

describe('ruleEventAppSchema', () => {
  it.each(['discover', 'observabilityAlerting', 'agent_builder', 'app.name:id'])(
    'accepts %s',
    (app) => {
      expect(ruleEventAppSchema.parse(app)).toBe(app);
    }
  );

  it('accepts an app id at the length bound', () => {
    const app = 'a'.repeat(RULE_EVENT_APP_MAX_LENGTH);
    expect(ruleEventAppSchema.parse(app)).toBe(app);
  });

  it.each([
    ['is empty', ''],
    ['contains a space', 'my app'],
    ['contains a slash', 'discover/app'],
    ['is longer than the bound', 'a'.repeat(RULE_EVENT_APP_MAX_LENGTH + 1)],
  ])('rejects an app that %s', (_description, app) => {
    expect(ruleEventAppSchema.safeParse(app).success).toBe(false);
  });
});

describe('ruleEventOriginSchema', () => {
  it('accepts a channel without an app', () => {
    expect(ruleEventOriginSchema.parse({ channel: 'api' })).toEqual({ channel: 'api' });
  });

  it('accepts a bounded app', () => {
    expect(ruleEventOriginSchema.parse({ channel: 'ui', app: 'discover' })).toEqual({
      channel: 'ui',
      app: 'discover',
    });
  });

  it('rejects an app outside the bound', () => {
    expect(ruleEventOriginSchema.safeParse({ channel: 'ui', app: 'not an app' }).success).toBe(
      false
    );
  });
});

describe('ruleChangedEventOriginSchema', () => {
  it('requires an actor and a channel', () => {
    expect(ruleChangedEventOriginSchema.parse({ actor: 'user', channel: 'api' })).toEqual({
      actor: 'user',
      channel: 'api',
    });
  });

  it('accepts a bounded app', () => {
    expect(
      ruleChangedEventOriginSchema.parse({
        actor: 'internal',
        channel: 'ui',
        app: 'discover',
      })
    ).toEqual({ actor: 'internal', channel: 'ui', app: 'discover' });
  });

  it('rejects an unknown actor', () => {
    expect(
      ruleChangedEventOriginSchema.safeParse({ actor: 'system', channel: 'api' }).success
    ).toBe(false);
  });
});
