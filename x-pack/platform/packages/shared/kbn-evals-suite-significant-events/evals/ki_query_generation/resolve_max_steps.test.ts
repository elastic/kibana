/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveMaxSteps } from './resolve_max_steps';

describe('resolveMaxSteps', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it('returns undefined when unset', () => {
    delete process.env.KI_QUERY_GENERATION_MAX_STEPS;
    expect(resolveMaxSteps()).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '';
    expect(resolveMaxSteps()).toBeUndefined();
  });

  it('parses a valid integer', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '12';
    expect(resolveMaxSteps()).toBe(12);
  });

  it('rejects zero', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '0';
    expect(() => resolveMaxSteps()).toThrow(/1 to 20/);
  });

  it('rejects negative integers', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '-1';
    expect(() => resolveMaxSteps()).toThrow(/1 to 20/);
  });

  it('rejects decimals', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '1.5';
    expect(() => resolveMaxSteps()).toThrow(/1 to 20/);
  });

  it('rejects out-of-range integers', () => {
    process.env.KI_QUERY_GENERATION_MAX_STEPS = '21';
    expect(() => resolveMaxSteps()).toThrow(/1 to 20/);
  });
});
