/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getItemSetIndexesIntersection } from './get_item_set_indexes_intersection';

describe('getItemSetIndexesIntersection', () => {
  it('returns intersection for two sorted arrays', () => {
    expect(getItemSetIndexesIntersection([0, 2, 4, 7, 10], [1, 2, 4, 6, 10, 11])).toEqual([
      2, 4, 10,
    ]);
  });

  it('returns empty array when there is no overlap', () => {
    expect(getItemSetIndexesIntersection([1, 3, 5], [2, 4, 6])).toEqual([]);
  });

  it('returns empty array when one side is empty', () => {
    expect(getItemSetIndexesIntersection([], [1, 2, 3])).toEqual([]);
  });
});
