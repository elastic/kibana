/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTTY } from './prompts';

describe('isTTY', () => {
  const originalCi = process.env.CI;
  const originalStdinIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');

  const setStdinIsTTY = (value: boolean | undefined) => {
    Object.defineProperty(process.stdin, 'isTTY', { value, configurable: true, writable: true });
  };

  afterEach(() => {
    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }
    if (originalStdinIsTTY) {
      Object.defineProperty(process.stdin, 'isTTY', originalStdinIsTTY);
    } else {
      delete (process.stdin as { isTTY?: boolean }).isTTY;
    }
  });

  it('is true when stdin is a TTY and CI is not set', () => {
    delete process.env.CI;
    setStdinIsTTY(true);

    expect(isTTY()).toBe(true);
  });

  it('is false when stdin is a TTY but CI is set (CI agents allocate a PTY)', () => {
    process.env.CI = 'true';
    setStdinIsTTY(true);

    expect(isTTY()).toBe(false);
  });

  it('is false when stdin is not a TTY', () => {
    delete process.env.CI;
    setStdinIsTTY(undefined);

    expect(isTTY()).toBe(false);
  });
});
