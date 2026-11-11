/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTTY } from './prompts';

describe('isTTY', () => {
  const originalCi = process.env.CI;
  const originalIsTTY = process.stdin.isTTY;

  const setStdinIsTTY = (value: boolean | undefined) => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value,
      configurable: true,
    });
  };

  afterEach(() => {
    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }
    setStdinIsTTY(originalIsTTY);
  });

  it('is true on a terminal outside CI', () => {
    delete process.env.CI;
    setStdinIsTTY(true);

    expect(isTTY()).toBe(true);
  });

  it('is false when stdin is not a terminal', () => {
    delete process.env.CI;
    setStdinIsTTY(undefined);

    expect(isTTY()).toBe(false);
  });

  it('is false in CI even when stdin is a terminal', () => {
    process.env.CI = 'true';
    setStdinIsTTY(true);

    expect(isTTY()).toBe(false);
  });
});
