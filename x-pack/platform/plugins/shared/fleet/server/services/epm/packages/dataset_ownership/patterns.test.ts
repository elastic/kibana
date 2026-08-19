/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchesPattern, patternsOverlap } from './patterns';

describe('matchesPattern', () => {
  it.each([
    ['logs-*-*', 'logs-nginx.access-default', true],
    ['logs-payroll.records-*', 'logs-other-default', false],
    ['logs-foo.*-*', 'logs-foo.bar-default', true],
    ['logs-foo.*-*', 'logs-foox.bar-default', false],
    ['logs-?oo-*', 'logs-foo-default', true],
    ['*', 'anything', true],
  ])('matchesPattern(%s, %s) is %s', (pattern, name, expected) => {
    expect(matchesPattern(pattern, name)).toBe(expected);
  });

  it('treats a dot as a literal, not a wildcard', () => {
    expect(matchesPattern('logs-foo.bar-*', 'logs-fooxbar-default')).toBe(false);
  });
});

describe('patternsOverlap', () => {
  it.each([
    // The case v2 got wrong: both match logs-foo.x-bar-z.
    ['logs-foo.*-*', 'logs-*-bar-*', true],
    ['logs-*-bar-*', 'logs-foo.*-*', true],
    ['logs-foo.*-*', 'logs-foo.bar-*', true],
    ['logs-foo.bar-*', 'logs-foo.*-*', true],
    ['logs-foo-*', 'logs-foo-*', true],
    ['logs-*-*', 'logs-payroll.records-*', true],
    ['logs-foo-*', 'logs-bar-*', false],
    ['logs-foo.bar-*', 'logs-fooxbar-*', false],
    ['logs-foo', 'logs-foo-*', false],
    ['a*', '*b', true],
    ['ab', 'ac', false],
    ['a?c', 'abc', true],
    ['a?c', 'ac', false],
  ])('patternsOverlap(%s, %s) is %s', (a, b, expected) => {
    expect(patternsOverlap(a, b)).toBe(expected);
  });

  it('is symmetric', () => {
    const cases: Array<[string, string]> = [
      ['logs-foo.*-*', 'logs-*-bar-*'],
      ['logs-foo-*', 'logs-bar-*'],
      ['logs-*-*', 'logs-payroll.records-*'],
    ];
    for (const [a, b] of cases) {
      expect(patternsOverlap(a, b)).toBe(patternsOverlap(b, a));
    }
  });

  it('agrees with brute force over short alphabets', () => {
    const alphabet = ['a', 'b', '-'];
    const patterns = ['a*', '*b', 'a-*', '*-b', 'a?b', '*', 'ab', 'a*b'];
    const strings: string[] = [''];
    for (let length = 1; length <= 4; length++) {
      const previous = strings.filter((s) => s.length === length - 1);
      for (const prefix of previous) {
        for (const char of alphabet) strings.push(prefix + char);
      }
    }

    for (const a of patterns) {
      for (const b of patterns) {
        const bruteForce = strings.some((s) => matchesPattern(a, s) && matchesPattern(b, s));
        expect([a, b, patternsOverlap(a, b)]).toEqual([a, b, bruteForce]);
      }
    }
  });
});
