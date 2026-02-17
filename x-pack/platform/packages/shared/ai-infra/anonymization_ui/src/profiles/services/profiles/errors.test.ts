/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureProfilesApiError, isProfilesApiError, mapProfilesApiError } from './errors';

describe('mapProfilesApiError', () => {
  it('maps known HTTP status codes to expected kinds', () => {
    expect(mapProfilesApiError({ statusCode: 409 }).kind).toBe('conflict');
    expect(mapProfilesApiError({ statusCode: 403 }).kind).toBe('forbidden');
    expect(mapProfilesApiError({ statusCode: 401 }).kind).toBe('unauthorized');
    expect(mapProfilesApiError({ statusCode: 404 }).kind).toBe('not_found');
    expect(mapProfilesApiError({ statusCode: 500 }).kind).toBe('unknown');
  });

  it('maps missing/zero status to network', () => {
    expect(mapProfilesApiError({ statusCode: 0 }).kind).toBe('network');
    expect(mapProfilesApiError(new Error('boom')).kind).toBe('network');
  });

  it('prefers response body message when present', () => {
    const mapped = mapProfilesApiError({
      statusCode: 409,
      body: { message: 'duplicate profile target' },
    });

    expect(mapped.message).toBe('duplicate profile target');
  });
});

describe('isProfilesApiError', () => {
  it('returns true for mapped errors and false for unknown shapes', () => {
    expect(isProfilesApiError(mapProfilesApiError({ statusCode: 403 }))).toBe(true);
    expect(isProfilesApiError({ kind: 'random' })).toBe(false);
    expect(isProfilesApiError(new Error('plain'))).toBe(false);
  });
});

describe('ensureProfilesApiError', () => {
  it('returns provided ProfilesApiError unchanged', () => {
    const mapped = mapProfilesApiError({ statusCode: 403 });
    expect(ensureProfilesApiError(mapped)).toBe(mapped);
  });

  it('maps statusCode-like errors through mapProfilesApiError', () => {
    const mapped = ensureProfilesApiError({ statusCode: 401 });
    expect(mapped.kind).toBe('unauthorized');
  });

  it('converts plain errors to unknown kind and preserves message', () => {
    const normalized = ensureProfilesApiError(new Error('invalid payload'));
    expect(normalized.kind).toBe('unknown');
    expect(normalized.message).toBe('invalid payload');
  });

  it('uses fallback message when unknown error has no message', () => {
    const normalized = ensureProfilesApiError('boom', 'Unexpected profiles failure');
    expect(normalized.kind).toBe('unknown');
    expect(normalized.message).toBe('Unexpected profiles failure');
  });
});
