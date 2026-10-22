/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_EVENT_APP_MAX_LENGTH, eventOriginSchema, ruleEventAppSchema } from './origin_schemas';

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

describe('eventOriginSchema', () => {
  it('requires an actor and a channel', () => {
    expect(eventOriginSchema.parse({ actor: 'user', channel: 'api' })).toEqual({
      actor: 'user',
      channel: 'api',
    });
  });

  it('rejects a missing channel', () => {
    expect(eventOriginSchema.safeParse({ actor: 'user' }).success).toBe(false);
  });

  it('accepts a channel and a bounded app', () => {
    expect(eventOriginSchema.parse({ actor: 'internal', channel: 'ui', app: 'discover' })).toEqual({
      actor: 'internal',
      channel: 'ui',
      app: 'discover',
    });
  });

  it('rejects an unknown actor', () => {
    expect(eventOriginSchema.safeParse({ actor: 'system', channel: 'api' }).success).toBe(false);
  });

  it('rejects an app outside the bound', () => {
    expect(
      eventOriginSchema.safeParse({ actor: 'user', channel: 'ui', app: 'not an app' }).success
    ).toBe(false);
  });
});
