/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeMatcher } from './normalize_matcher';

describe('normalizeMatcher', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty object', {}],
    ['empty tags', { tags: [] }],
    ['a null expression', { expression: null }],
    ['a blank expression', { expression: '   ' }],
    ['both leaves empty', { tags: [], expression: '' }],
  ])('returns undefined for %s', (_label, matcher) => {
    expect(normalizeMatcher(matcher)).toBeUndefined();
  });

  it('keeps the leaf that constrains something and drops the one that does not', () => {
    expect(normalizeMatcher({ tags: [], expression: 'severity: 1' })).toStrictEqual({
      expression: 'severity: 1',
    });
    expect(normalizeMatcher({ tags: ['prod'], expression: '  ' })).toStrictEqual({
      tags: ['prod'],
    });
  });

  it('trims the expression', () => {
    expect(normalizeMatcher({ expression: '  severity: 1  ' })).toStrictEqual({
      expression: 'severity: 1',
    });
  });

  it('keeps both leaves when both constrain', () => {
    expect(normalizeMatcher({ tags: ['prod'], expression: 'severity: 1' })).toStrictEqual({
      tags: ['prod'],
      expression: 'severity: 1',
    });
  });
});
