/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * True when `name` matches an Elasticsearch index pattern. `*` matches any run of characters and
 * `?` matches exactly one; every other character is literal, so a `.` in a dataset name is not a
 * wildcard.
 */
export const matchesPattern = (pattern: string, name: string): boolean => {
  const regexStr =
    '^' +
    pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.') +
    '$';
  return new RegExp(regexStr).test(name);
};

const matchesOnlyEmpty = (pattern: string, from: number): boolean => {
  for (let i = from; i < pattern.length; i++) {
    if (pattern[i] !== '*') return false;
  }
  return true;
};

/**
 * True when some index name matches both patterns. Exact, not a heuristic: a false negative would
 * let one package's template silently govern another's indices.
 *
 * Standard wildcard-intersection recurrence over (i, j). A `*` either matches nothing and yields to
 * the rest of its own pattern, or absorbs one unit of the other pattern.
 */
export const patternsOverlap = (a: string, b: string): boolean => {
  const memo = new Map<number, boolean>();
  const stride = b.length + 1;

  const go = (i: number, j: number): boolean => {
    const key = i * stride + j;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let result: boolean;
    if (i === a.length && j === b.length) {
      result = true;
    } else if (i === a.length) {
      result = matchesOnlyEmpty(b, j);
    } else if (j === b.length) {
      result = matchesOnlyEmpty(a, i);
    } else if (a[i] === '*') {
      result = go(i + 1, j) || go(i, j + 1);
    } else if (b[j] === '*') {
      result = go(i, j + 1) || go(i + 1, j);
    } else if (a[i] === '?' || b[j] === '?') {
      result = go(i + 1, j + 1);
    } else {
      result = a[i] === b[j] && go(i + 1, j + 1);
    }

    memo.set(key, result);
    return result;
  };

  return go(0, 0);
};
