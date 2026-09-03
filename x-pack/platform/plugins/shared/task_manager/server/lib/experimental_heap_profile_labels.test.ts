/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HEAP_PROFILE_LABELS_ENV,
  hasHeapProfileLabelsApi,
  isHeapProfileLabelsEnabled,
  withTaskTypeHeapProfileLabels,
} from './experimental_heap_profile_labels';

describe('experimental_heap_profile_labels', () => {
  const previous = process.env[HEAP_PROFILE_LABELS_ENV];

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[HEAP_PROFILE_LABELS_ENV];
    } else {
      process.env[HEAP_PROFILE_LABELS_ENV] = previous;
    }
  });

  test('is disabled unless KBN_HEAP_PROFILE_LABELS=1', () => {
    delete process.env[HEAP_PROFILE_LABELS_ENV];
    expect(isHeapProfileLabelsEnabled()).toBe(false);
    process.env[HEAP_PROFILE_LABELS_ENV] = '1';
    expect(isHeapProfileLabelsEnabled()).toBe(true);
  });

  test('stock Node has no heap profile labels API', () => {
    expect(hasHeapProfileLabelsApi()).toBe(false);
  });

  test('wrap is a transparent no-op on stock Node even when the env flag is set', async () => {
    process.env[HEAP_PROFILE_LABELS_ENV] = '1';
    const result = await withTaskTypeHeapProfileLabels('alerting:monitoring', async () => 7);
    expect(result).toBe(7);
  });
});
