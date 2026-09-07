/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeChangeHistoryVersionDistance } from './compute_change_history_version_distance';

describe('computeChangeHistoryVersionDistance', () => {
  it('returns the absolute distance when both versions are present', () => {
    expect(
      computeChangeHistoryVersionDistance(
        { metadata: { version: 5 } },
        { metadata: { version: 8 } }
      )
    ).toBe(3);
  });

  it('returns undefined when either version is missing', () => {
    expect(computeChangeHistoryVersionDistance({ metadata: { version: 5 } }, {})).toBeUndefined();
    expect(computeChangeHistoryVersionDistance({}, { metadata: { version: 8 } })).toBeUndefined();
  });
});
