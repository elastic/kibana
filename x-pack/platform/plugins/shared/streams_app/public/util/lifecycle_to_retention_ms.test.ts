/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lifecycleToRetentionMs } from './lifecycle_to_retention_ms';

describe('lifecycleToRetentionMs', () => {
  it('returns 0 when there is no lifecycle', () => {
    expect(lifecycleToRetentionMs(undefined)).toBe(0);
  });

  it('converts a DSL data_retention to milliseconds', () => {
    expect(lifecycleToRetentionMs({ dsl: { data_retention: '30d' } })).toBe(
      30 * 24 * 60 * 60 * 1000
    );
  });

  it('treats a DSL lifecycle without data_retention as indefinite', () => {
    expect(lifecycleToRetentionMs({ dsl: {} })).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns undefined for an unparseable DSL duration', () => {
    expect(lifecycleToRetentionMs({ dsl: { data_retention: '30w' } })).toBeUndefined();
  });

  it('returns undefined for ILM because the delete age is not on the list payload', () => {
    expect(lifecycleToRetentionMs({ ilm: { policy: 'my-policy' } })).toBeUndefined();
  });
});
