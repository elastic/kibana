/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_RUN_LIMITS,
  DEFAULT_RUN_QUOTA_SETTINGS,
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
} from './types';

describe('run quota defaults', () => {
  it('uses the contracted daily limits and leaves memory uncapped', () => {
    expect(DEFAULT_RUN_LIMITS).toEqual({
      detection: { enabled: true, max: 100 },
      investigation: { enabled: true, max: 30 },
      ki_extraction: { enabled: true, max: 20 },
      memory: { enabled: false, max: 0 },
    });
  });

  it('derives the default settings from the default limits', () => {
    expect(DEFAULT_RUN_QUOTA_SETTINGS).toEqual({
      timezone: 'UTC',
      limits: DEFAULT_RUN_LIMITS,
    });
  });

  it('exports the contracted editable range', () => {
    expect(MIN_RUN_LIMIT).toBe(1);
    expect(MAX_RUN_LIMIT).toBe(10_000);
  });
});
