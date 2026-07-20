/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isInaccessibleEpisodeDataError } from './esql_search_error';

describe('isInaccessibleEpisodeDataError', () => {
  it('returns false for non-object errors', () => {
    expect(isInaccessibleEpisodeDataError(undefined)).toBe(false);
    expect(isInaccessibleEpisodeDataError(null)).toBe(false);
    expect(isInaccessibleEpisodeDataError('boom')).toBe(false);
  });

  it('is true for an "unknown index" verification error (alerts:none user)', () => {
    // Elasticsearch hides the index, so ES|QL reports it as unknown (HTTP 400)
    // rather than returning a 403.
    expect(isInaccessibleEpisodeDataError(new Error('Unknown index [.rule-events]'))).toBe(true);
    expect(
      isInaccessibleEpisodeDataError({
        attributes: { error: { reason: 'Unknown index [.rule-events]' } },
      })
    ).toBe(true);
  });

  it('is true for a 403/404 surfaced via the wrapped ES|QL response status', () => {
    expect(isInaccessibleEpisodeDataError({ attributes: { rawResponse: { status: 403 } } })).toBe(
      true
    );
    expect(isInaccessibleEpisodeDataError({ attributes: { rawResponse: { status: 404 } } })).toBe(
      true
    );
  });

  it('is true for a 403/404 surfaced via an HTTP error', () => {
    expect(isInaccessibleEpisodeDataError({ statusCode: 403 })).toBe(true);
    expect(isInaccessibleEpisodeDataError({ response: { status: 404 } })).toBe(true);
  });

  it('is false for other failures (they should show an error callout)', () => {
    expect(isInaccessibleEpisodeDataError({ statusCode: 500 })).toBe(false);
    expect(isInaccessibleEpisodeDataError({ response: { status: 400 } })).toBe(false);
    expect(isInaccessibleEpisodeDataError(new Error('boom'))).toBe(false);
  });
});
