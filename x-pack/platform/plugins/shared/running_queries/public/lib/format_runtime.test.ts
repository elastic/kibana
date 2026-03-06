/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatRuntime } from './format_runtime';

describe('formatRuntime', () => {
  it('formats seconds for runtimes under one minute', () => {
    expect(formatRuntime(5_000)).toBe('5 secs');
  });

  it('never shows 0 secs for non-zero runtimes', () => {
    expect(formatRuntime(100)).toBe('1 sec');
  });

  it('does not round minutes up', () => {
    expect(formatRuntime(119_000)).toBe('1 min');
  });

  it('formats hours and minutes', () => {
    expect(formatRuntime(1 * 60 * 60 * 1000 + 5 * 60 * 1000)).toBe('1 hour 5 mins');
  });
});
