/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendReturnParams, readReturnParams } from './return_params';

describe('readReturnParams', () => {
  it('returns both params when they are non-empty', () => {
    expect(readReturnParams('?returnAppId=observabilityOnboarding&returnPath=%3F')).toEqual({
      returnAppId: 'observabilityOnboarding',
      returnPath: '?',
    });
  });

  it('accepts a search string without a leading ?', () => {
    expect(readReturnParams('returnAppId=observabilityOnboarding&returnPath=%3F')).toEqual({
      returnAppId: 'observabilityOnboarding',
      returnPath: '?',
    });
  });

  it('returns undefined when returnAppId is missing', () => {
    expect(readReturnParams('?returnPath=%3F')).toBeUndefined();
  });

  it('returns undefined when returnPath is missing', () => {
    expect(readReturnParams('?returnAppId=observabilityOnboarding')).toBeUndefined();
  });

  it('returns undefined when either value is empty', () => {
    expect(readReturnParams('?returnAppId=&returnPath=%3F')).toBeUndefined();
    expect(readReturnParams('?returnAppId=observabilityOnboarding&returnPath=')).toBeUndefined();
  });
});

describe('appendReturnParams', () => {
  const params = { returnAppId: 'observabilityOnboarding', returnPath: '?' };

  it('returns the path unchanged when params are missing', () => {
    expect(appendReturnParams('/browse')).toBe('/browse');
    expect(appendReturnParams('/browse', undefined)).toBe('/browse');
  });

  it('appends params onto a path with no query', () => {
    expect(appendReturnParams('/browse', params)).toBe(
      '/browse?returnAppId=observabilityOnboarding&returnPath=%3F'
    );
  });

  it('keeps existing query keys', () => {
    expect(appendReturnParams('/browse?q=nginx', params)).toBe(
      '/browse?q=nginx&returnAppId=observabilityOnboarding&returnPath=%3F'
    );
  });

  it('returns the path unchanged when either param is empty', () => {
    expect(appendReturnParams('/browse', { returnAppId: '', returnPath: '?' })).toBe('/browse');
    expect(
      appendReturnParams('/browse?q=nginx', {
        returnAppId: 'observabilityOnboarding',
        returnPath: '',
      })
    ).toBe('/browse?q=nginx');
  });
});
