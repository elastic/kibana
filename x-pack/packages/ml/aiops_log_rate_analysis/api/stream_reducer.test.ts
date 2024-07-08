/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantTerms } from '@kbn/aiops-test-utils/artificial_logs/significant_terms';
import { finalSignificantItemGroups } from '@kbn/aiops-test-utils/artificial_logs/final_significant_item_groups';

import {
  addSignificantItems,
  addSignificantItemsGroup,
  resetAll,
  resetGroups,
  updateLoadingState,
  getDefaultState,
  streamReducer,
} from './stream_reducer';

describe('streamReducer', () => {
  it('updates loading state', () => {
    const state = streamReducer(
      getDefaultState(),
      updateLoadingState({ ccsWarning: true, loaded: 50, loadingState: 'Loaded 50%' })
    );

    expect(state).toEqual({
      ccsWarning: true,
      loaded: 50,
      loadingState: 'Loaded 50%',
      significantItems: [],
      significantItemsGroups: [],
      errors: [],
      zeroDocsFallback: false,
    });
  });

  it('adds significant item, then resets all state again', () => {
    const state1 = streamReducer(
      getDefaultState(),
      addSignificantItems([
        {
          key: 'the-field-name:the-field-value',
          type: 'keyword',
          fieldName: 'the-field-name',
          fieldValue: 'the-field-value',
          doc_count: 10,
          bg_count: 100,
          total_doc_count: 1000,
          total_bg_count: 10000,
          score: 0.1,
          pValue: 0.01,
          normalizedScore: 0.123,
        },
      ])
    );

    expect(state1.significantItems).toHaveLength(1);

    const state2 = streamReducer(state1, resetAll());

    expect(state2.significantItems).toHaveLength(0);
  });

  it('adds significant items and groups, then resets groups only', () => {
    const state1 = streamReducer(getDefaultState(), addSignificantItems(significantTerms));

    expect(state1.significantItems).toHaveLength(4);
    expect(state1.significantItemsGroups).toHaveLength(0);

    const state2 = streamReducer(state1, addSignificantItemsGroup(finalSignificantItemGroups));

    expect(state2.significantItems).toHaveLength(4);
    expect(state2.significantItemsGroups).toHaveLength(4);

    const state3 = streamReducer(state2, resetGroups());

    expect(state3.significantItems).toHaveLength(4);
    expect(state3.significantItemsGroups).toHaveLength(0);
  });
});
