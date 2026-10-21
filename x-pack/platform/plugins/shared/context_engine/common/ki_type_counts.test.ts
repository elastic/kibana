/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeTopKiTypeCounts } from './ki_type_counts';

describe('takeTopKiTypeCounts', () => {
  it('returns all counts when there are five or fewer types', () => {
    expect(
      takeTopKiTypeCounts([
        { type: 'index_metadata', count: 10 },
        { type: 'document', count: 8 },
        { type: 'detection', count: 7 },
      ])
    ).toEqual([
      { type: 'index_metadata', count: 10 },
      { type: 'document', count: 8 },
      { type: 'detection', count: 7 },
    ]);
  });

  it('returns only the top five types by count', () => {
    expect(
      takeTopKiTypeCounts([
        { type: 'faq', count: 6 },
        { type: 'policy', count: 5 },
        { type: 'playbook', count: 4 },
        { type: 'detection', count: 3 },
        { type: 'document', count: 2 },
        { type: 'index_metadata', count: 1 },
      ])
    ).toEqual([
      { type: 'faq', count: 6 },
      { type: 'policy', count: 5 },
      { type: 'playbook', count: 4 },
      { type: 'detection', count: 3 },
      { type: 'document', count: 2 },
    ]);
  });

  it('returns empty array when input is empty', () => {
    expect(takeTopKiTypeCounts([])).toEqual([]);
  });
});
