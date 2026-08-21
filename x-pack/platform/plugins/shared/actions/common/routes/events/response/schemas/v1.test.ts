/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_HANDSHAKE_CHALLENGE_LENGTH } from '@kbn/connector-specs';

import { ingestEventsAckResponseSchema } from './v1';

describe('ingestEventsAckResponseSchema', () => {
  it('accepts a bounded challenge echo', () => {
    expect(ingestEventsAckResponseSchema.validate({ challenge: 'abc' })).toEqual({
      challenge: 'abc',
    });
  });

  it('accepts other JSON 200 bodies', () => {
    expect(ingestEventsAckResponseSchema.validate({})).toEqual({});
    expect(ingestEventsAckResponseSchema.validate({ ok: true })).toEqual({ ok: true });
  });

  it('rejects an empty or oversize challenge', () => {
    expect(() => ingestEventsAckResponseSchema.validate({ challenge: '' })).toThrow();
    expect(() =>
      ingestEventsAckResponseSchema.validate({
        challenge: 'x'.repeat(MAX_HANDSHAKE_CHALLENGE_LENGTH + 1),
      })
    ).toThrow();
  });
});
