/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFormattedError } from './errors';

describe('getFormattedError', () => {
  it('returns the original Error when no Boom body is present', () => {
    const err = new Error('base message');
    expect(getFormattedError(err)).toBe(err);
  });

  it('prefers a Boom payload body.message when present', () => {
    const err = {
      body: { statusCode: 404, error: 'Not Found', message: 'Backing data stream is missing' },
    };

    expect(getFormattedError(err).message).toBe('Backing data stream is missing');
  });

  it('uses a string body as message when provided', () => {
    const err = { body: 'Not Found' };
    expect(getFormattedError(err).message).toBe('Not Found');
  });

  it('handles non-Error thrown values', () => {
    expect(getFormattedError('boom').message).toBe('boom');
    expect(getFormattedError({}).message).toBe('Unknown error');
  });
});

