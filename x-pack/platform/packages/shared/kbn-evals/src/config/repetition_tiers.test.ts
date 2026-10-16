/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPETITION_TIERS, resolveRepetitions } from './repetition_tiers';

describe('resolveRepetitions', () => {
  it('maps each tier to its repetition budget', () => {
    expect(REPETITION_TIERS).toEqual({ smoke: 1, confirm: 3, publish: 5 });
    expect(resolveRepetitions({ EVAL_REPETITION_TIER: 'smoke' })).toBe(1);
    expect(resolveRepetitions({ EVAL_REPETITION_TIER: 'confirm' })).toBe(3);
    expect(resolveRepetitions({ EVAL_REPETITION_TIER: 'publish' })).toBe(5);
  });

  it('accepts tier names case-insensitively', () => {
    expect(resolveRepetitions({ EVAL_REPETITION_TIER: ' Publish ' })).toBe(5);
  });

  it('keeps the existing priority when no tier is set: env, then configured, then 1', () => {
    expect(resolveRepetitions({ EVAL_REPETITIONS: '4' }, 2)).toBe(4);
    expect(resolveRepetitions({}, 2)).toBe(2);
    expect(resolveRepetitions({})).toBe(1);
  });

  it('treats the empty string the fanout forwards for unset vars as unset', () => {
    expect(resolveRepetitions({ EVAL_REPETITIONS: '', EVAL_REPETITION_TIER: '' }, 2)).toBe(2);
    expect(resolveRepetitions({ EVAL_REPETITIONS: '', EVAL_REPETITION_TIER: 'confirm' })).toBe(3);
  });

  it('lets a tier override the suite-configured default', () => {
    expect(resolveRepetitions({ EVAL_REPETITION_TIER: 'publish' }, 1)).toBe(5);
  });

  it('accepts an explicit count that agrees with the tier', () => {
    expect(resolveRepetitions({ EVAL_REPETITIONS: '5', EVAL_REPETITION_TIER: 'publish' })).toBe(5);
  });

  it('refuses an explicit count that contradicts the tier', () => {
    expect(() =>
      resolveRepetitions({ EVAL_REPETITIONS: '1', EVAL_REPETITION_TIER: 'publish' })
    ).toThrow(/contradicts EVAL_REPETITION_TIER=publish/);
  });

  it('refuses an unknown tier instead of silently running n=1', () => {
    expect(() => resolveRepetitions({ EVAL_REPETITION_TIER: 'full' })).toThrow(
      /Unknown EVAL_REPETITION_TIER "full".*smoke \(n=1\), confirm \(n=3\), publish \(n=5\)/
    );
  });
});
