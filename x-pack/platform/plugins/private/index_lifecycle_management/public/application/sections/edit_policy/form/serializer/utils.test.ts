/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { excludeControlledRolloverThresholds } from './utils';

describe('excludeControlledRolloverThresholds', () => {
  it('removes all UI-controlled max_* thresholds', () => {
    const result = excludeControlledRolloverThresholds({
      max_age: '30d',
      max_docs: 1000,
      max_primary_shard_size: '50gb',
      max_primary_shard_docs: 500,
      max_size: '100gb',
    });

    expect(result).toEqual({});
  });

  it('preserves min_* fields', () => {
    const result = excludeControlledRolloverThresholds({
      max_age: '30d',
      min_age: '1d',
      min_docs: 100,
      min_size: '10gb',
      min_primary_shard_size: '5gb',
      min_primary_shard_docs: 50,
    });

    expect(result).toEqual({
      min_age: '1d',
      min_docs: 100,
      min_size: '10gb',
      min_primary_shard_size: '5gb',
      min_primary_shard_docs: 50,
    });
  });

  it('preserves unknown fields not managed by the UI', () => {
    const result = excludeControlledRolloverThresholds({
      max_age: '30d',
      // @ts-expect-error - unknown field that should still be preserved
      unknown_setting: 123,
    });

    expect(result).toEqual({ unknown_setting: 123 });
  });

  it('returns an empty object for an empty input', () => {
    expect(excludeControlledRolloverThresholds({})).toEqual({});
  });
});
