/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventOriginEbtSchema, toEventOrigin } from './event_origin';

describe('toEventOrigin', () => {
  it('keeps actor, channel and app', () => {
    expect(toEventOrigin({ actor: 'user', channel: 'ui', app: 'discover' })).toEqual({
      actor: 'user',
      channel: 'ui',
      app: 'discover',
    });
  });

  it.each([undefined, ''])('drops app when it is %p', (app) => {
    const origin = toEventOrigin({ actor: 'internal', channel: 'system', app });

    expect(origin).toEqual({ actor: 'internal', channel: 'system' });
    expect(origin).not.toHaveProperty('app');
  });
});

describe('eventOriginEbtSchema', () => {
  it('declares actor and channel as required and app as optional', () => {
    expect(eventOriginEbtSchema).toMatchObject({
      properties: {
        actor: { type: 'keyword', _meta: { optional: false } },
        channel: { type: 'keyword', _meta: { optional: false } },
        app: { type: 'keyword', _meta: { optional: true } },
      },
      _meta: { optional: false },
    });
  });
});
