/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readRunCounts } from './rule_run_counts';

describe('readRunCounts', () => {
  it('reads both the matcher shape and the related user shape', () => {
    expect(readRunCounts({ resolutionsCreated: 2 })?.links_created).toBe(2);
    expect(readRunCounts({ linksCreated: 7, skippedAmbiguous: 1 })).toMatchObject({
      links_created: 7,
      skipped_ambiguous: 1,
    });
  });

  it('returns nothing when there was no run', () => {
    expect(readRunCounts(null)).toBeUndefined();
  });
});
