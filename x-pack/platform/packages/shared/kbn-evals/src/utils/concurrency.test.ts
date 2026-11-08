/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConcurrencyFromEnv, parseConcurrency } from './concurrency';

describe('parseConcurrency', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['  ', undefined],
    ['1', 1],
    ['8', 8],
    [' 16 ', 16],
  ])('reads %p as %p', (value, expected) => {
    expect(parseConcurrency(value, '--concurrency')).toBe(expected);
  });

  it.each(['0', '-1', 'abc', '1.5', '8x', '1e2', '9'.repeat(400), '9007199254740993'])(
    'rejects %p',
    (value) => {
      expect(() => parseConcurrency(value, '--concurrency')).toThrow(
        `--concurrency must be a positive integer, got "${value}".`
      );
    }
  );
});

describe('getConcurrencyFromEnv', () => {
  const previous = process.env.EVAL_CONCURRENCY;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.EVAL_CONCURRENCY;
    } else {
      process.env.EVAL_CONCURRENCY = previous;
    }
  });

  it('reads EVAL_CONCURRENCY', () => {
    process.env.EVAL_CONCURRENCY = '12';
    expect(getConcurrencyFromEnv()).toBe(12);
  });

  it('names EVAL_CONCURRENCY when it is invalid', () => {
    process.env.EVAL_CONCURRENCY = 'abc';
    expect(() => getConcurrencyFromEnv()).toThrow(
      'EVAL_CONCURRENCY must be a positive integer, got "abc".'
    );
  });

  it('is undefined when EVAL_CONCURRENCY is unset', () => {
    delete process.env.EVAL_CONCURRENCY;
    expect(getConcurrencyFromEnv()).toBeUndefined();
  });
});
