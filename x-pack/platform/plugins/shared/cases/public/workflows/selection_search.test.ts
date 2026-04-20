/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  collectSelectionSearchOptions,
  SELECTION_SEARCH_MAX_BROWSE_RESULTS,
} from './selection_search';

describe('collectSelectionSearchOptions', () => {
  it('caps how many source rows are scanned when browsing (empty query)', () => {
    const items = Array.from({ length: 20 }, (_, i) => `item_${i}`);
    const options = collectSelectionSearchOptions({
      items,
      hasEmptyQuery: true,
      matchesQuery: () => true,
      toOption: (v) => ({ value: v, label: v }),
    });
    expect(options).toHaveLength(SELECTION_SEARCH_MAX_BROWSE_RESULTS);
    expect(options[0]).toEqual({ value: 'item_0', label: 'item_0' });
    expect(options[14]).toEqual({ value: 'item_14', label: 'item_14' });
  });

  it('scans all source rows when filtering (non-empty query)', () => {
    const items = ['a', 'b', 'match_tail'];
    const options = collectSelectionSearchOptions({
      items,
      hasEmptyQuery: false,
      matchesQuery: (v) => v.includes('tail'),
      toOption: (v) => ({ value: v, label: v }),
    });
    expect(options).toEqual([{ value: 'match_tail', label: 'match_tail' }]);
  });

  it('when browsing, includes every item in the scan range without using matchesQuery', () => {
    const items = Array.from({ length: 20 }, (_, i) => `item_${i}`);
    const options = collectSelectionSearchOptions({
      items,
      hasEmptyQuery: true,
      matchesQuery: () => false,
      toOption: (v) => ({ value: v, label: v }),
    });
    expect(options).toHaveLength(SELECTION_SEARCH_MAX_BROWSE_RESULTS);
  });
});
