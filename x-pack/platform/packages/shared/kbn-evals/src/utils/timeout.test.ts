/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeoutMsFromEnv, parseTimeoutMinutes } from './timeout';

describe('parseTimeoutMinutes', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['  ', undefined],
    ['1', 1],
    ['360', 360],
    [' 240 ', 240],
  ])('reads %p as %p', (value, expected) => {
    expect(parseTimeoutMinutes(value)).toBe(expected);
  });

  it.each(['0', '-1', 'abc', '1.5', '90m', '1e2', '9'.repeat(400), '9007199254740993'])(
    'rejects %p',
    (value) => {
      expect(() => parseTimeoutMinutes(value)).toThrow(
        `EVAL_TIMEOUT_MINUTES must be a positive integer, got "${value}".`
      );
    }
  );
});

describe('getTimeoutMsFromEnv', () => {
  const previous = process.env.EVAL_TIMEOUT_MINUTES;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.EVAL_TIMEOUT_MINUTES;
    } else {
      process.env.EVAL_TIMEOUT_MINUTES = previous;
    }
  });

  it('converts EVAL_TIMEOUT_MINUTES to milliseconds', () => {
    process.env.EVAL_TIMEOUT_MINUTES = '360';
    expect(getTimeoutMsFromEnv()).toBe(360 * 60_000);
  });

  it('is undefined when EVAL_TIMEOUT_MINUTES is unset', () => {
    delete process.env.EVAL_TIMEOUT_MINUTES;
    expect(getTimeoutMsFromEnv()).toBeUndefined();
  });

  it('is undefined when EVAL_TIMEOUT_MINUTES is empty, as CI forwards it', () => {
    process.env.EVAL_TIMEOUT_MINUTES = '';
    expect(getTimeoutMsFromEnv()).toBeUndefined();
  });
});
