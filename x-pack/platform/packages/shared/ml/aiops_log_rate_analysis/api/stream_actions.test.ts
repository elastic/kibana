/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addError, ping, streamReducerActions } from './stream_actions';
import { getDefaultState, streamReducer } from './stream_reducer';

describe('stream actions', () => {
  it('keeps the action types sent over the wire stable', () => {
    expect(
      Object.fromEntries(
        Object.entries(streamReducerActions).map(([name, creator]) => [name, creator.type])
      )
    ).toEqual({
      addSignificantItems: 'logRateAnalysisResults/addSignificantItems',
      addSignificantItemsHistogram: 'logRateAnalysisResults/addSignificantItemsHistogram',
      addSignificantItemsGroup: 'logRateAnalysisResults/addSignificantItemsGroup',
      addSignificantItemsGroupHistogram: 'logRateAnalysisResults/addSignificantItemsGroupHistogram',
      addError: 'logRateAnalysisResults/addError',
      ping: 'logRateAnalysisResults/ping',
      resetErrors: 'logRateAnalysisResults/resetErrors',
      resetGroups: 'logRateAnalysisResults/resetGroups',
      resetResults: 'logRateAnalysisResults/resetResults',
      updateLoadingState: 'logRateAnalysisResults/updateLoadingState',
      setZeroDocsFallback: 'logRateAnalysisResults/setZeroDocsFallback',
      setCurrentAnalysisType: 'logRateAnalysisResults/setCurrentAnalysisType',
      setCurrentAnalysisWindowParameters:
        'logRateAnalysisResults/setCurrentAnalysisWindowParameters',
    });
  });

  it('creates actions with the type and payload', () => {
    expect(addError('the-error')).toEqual({
      type: 'logRateAnalysisResults/addError',
      payload: 'the-error',
    });
  });

  it('serializes actions without a payload to just the type', () => {
    expect(JSON.stringify(ping())).toBe('{"type":"logRateAnalysisResults/ping"}');
  });

  it('creates actions the stream reducer handles', () => {
    const state = streamReducer(getDefaultState(), addError('the-error'));

    expect(state.errors).toEqual(['the-error']);
  });
});
