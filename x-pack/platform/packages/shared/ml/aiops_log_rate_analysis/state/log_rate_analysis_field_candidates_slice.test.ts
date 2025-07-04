/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

import type { FetchFieldCandidatesResponse } from '../queries/fetch_field_candidates';

import { fetchFieldCandidates, getDefaultState } from './log_rate_analysis_field_candidates_slice';

const mockHttp = httpServiceMock.createStartContract();

describe('fetchFieldCandidates', () => {
  it('dispatches field candidates', async () => {
    const mockDispatch = jest.fn();
    const mockGetState = jest.fn().mockReturnValue({
      logRateAnalysisFieldCandidates: getDefaultState(),
    });

    const mockResponse: FetchFieldCandidatesResponse = {
      isECS: false,
      keywordFieldCandidates: ['keyword-field', 'another-keyword-field'],
      selectedKeywordFieldCandidates: ['keyword-field'],
      textFieldCandidates: ['text-field', 'another-text-field', 'yet-another-text-field'],
      selectedTextFieldCandidates: ['text-field'],
    };

    mockHttp.post.mockResolvedValue(mockResponse);

    const startParams = {
      http: mockHttp,
      endpoint: '/internal/aiops/log_rate_analysis',
      apiVersion: '3',
      abortCtrl: { current: new AbortController() },
      body: {
        start: 0,
        end: 0,
        searchQuery: JSON.stringify({ match_all: {} }),
        timeFieldName: '@timestamp',
        index: 'myIndex',
        grouping: true,
        flushFix: true,
        baselineMin: 0,
        baselineMax: 0,
        deviationMin: 0,
        deviationMax: 0,
        sampleProbability: 1,
      },
      headers: {},
    };

    const action = fetchFieldCandidates(startParams);

    await action(mockDispatch, mockGetState, undefined);

    // Expected to be called 3 times including the pending and fulfilled actions.
    expect(mockDispatch).toHaveBeenCalledTimes(3);
    expect(mockDispatch).toHaveBeenNthCalledWith(2, {
      payload: {
        fieldSelectionMessage:
          '2 out of 5 fields were preselected for the analysis. Use the "Fields" dropdown to adjust the selection.',
        initialFieldFilterSkippedItems: [
          'another-keyword-field',
          'another-text-field',
          'yet-another-text-field',
        ],
        currentFieldFilterSkippedItems: [
          'another-keyword-field',
          'another-text-field',
          'yet-another-text-field',
        ],
        fieldFilterUniqueItems: [
          'another-keyword-field',
          'another-text-field',
          'keyword-field',
          'text-field',
          'yet-another-text-field',
        ],
        keywordFieldCandidates: ['keyword-field', 'another-keyword-field'],
        selectedKeywordFieldCandidates: ['keyword-field'],
        selectedTextFieldCandidates: ['text-field'],
        textFieldCandidates: ['text-field', 'another-text-field', 'yet-another-text-field'],
      },
      type: 'log_rate_analysis_field_candidates/setAllFieldCandidates',
    });
  });
});
