/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupKiTypeCountsForSummary, KI_OTHERS_TYPE } from './ki_type_counts';

describe('groupKiTypeCountsForSummary', () => {
  it('returns all types when the total matches the visible sum', () => {
    expect(
      groupKiTypeCountsForSummary(
        [
          { type: 'index_metadata', count: 10 },
          { type: 'document', count: 8 },
          { type: 'detection', count: 7 },
        ],
        25
      )
    ).toEqual([
      { type: 'index_metadata', count: 10 },
      { type: 'document', count: 8 },
      { type: 'detection', count: 7 },
    ]);
  });

  it('groups overflow types into others when total exceeds the visible sum', () => {
    expect(
      groupKiTypeCountsForSummary(
        [
          { type: 'faq', count: 6 },
          { type: 'policy', count: 5 },
          { type: 'playbook', count: 4 },
          { type: 'detection', count: 3 },
          { type: 'document', count: 2 },
        ],
        21
      )
    ).toEqual([
      { type: 'faq', count: 6 },
      { type: 'policy', count: 5 },
      { type: 'playbook', count: 4 },
      { type: 'detection', count: 3 },
      { type: KI_OTHERS_TYPE, count: 3 },
    ]);
  });

  it('returns empty array when input is empty', () => {
    expect(groupKiTypeCountsForSummary([], 0)).toEqual([]);
  });
});
