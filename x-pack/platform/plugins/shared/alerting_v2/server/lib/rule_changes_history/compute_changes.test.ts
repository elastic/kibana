/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeChanges } from './compute_changes';

describe('computeChanges', () => {
  it('returns undefined when there is no predecessor', () => {
    expect(computeChanges({ name: 'a' }, undefined)).toBeUndefined();
  });

  it('returns an empty summary when current and previous are deep-equal', () => {
    expect(computeChanges({ name: 'a', tags: ['x'] }, { name: 'a', tags: ['x'] })).toEqual({
      count: 0,
      summary: {},
    });
  });

  it('emits null for keys added in current', () => {
    expect(computeChanges({ name: 'a', enabled: true }, { name: 'a' })).toEqual({
      count: 1,
      summary: { enabled: null },
    });
  });

  it('emits the previous value for keys removed from current', () => {
    expect(computeChanges({ name: 'a' }, { name: 'a', enabled: true })).toEqual({
      count: 1,
      summary: { enabled: true },
    });
  });

  it('emits the previous value for changed primitives', () => {
    expect(computeChanges({ name: 'b' }, { name: 'a' })).toEqual({
      count: 1,
      summary: { name: 'a' },
    });
  });

  it('recurses into nested objects and omits unchanged siblings', () => {
    expect(
      computeChanges(
        { metadata: { name: 'b', tags: ['x'] }, enabled: true },
        { metadata: { name: 'a', tags: ['x'] }, enabled: true }
      )
    ).toEqual({
      count: 1,
      summary: { metadata: { name: 'a' } },
    });
  });

  it('compares arrays as whole values', () => {
    expect(computeChanges({ tags: ['b'] }, { tags: ['a'] })).toEqual({
      count: 1,
      summary: { tags: ['a'] },
    });
  });

  it('treats undefined as absent', () => {
    expect(computeChanges({ name: 'a', note: 'hi' }, { name: 'a', note: undefined })).toEqual({
      count: 1,
      summary: { note: null },
    });
  });
});
