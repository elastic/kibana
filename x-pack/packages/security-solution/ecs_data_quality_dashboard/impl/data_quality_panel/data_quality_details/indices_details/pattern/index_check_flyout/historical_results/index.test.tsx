/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HistoricalResults } from '.';
import { screen, render } from '@testing-library/react';
import {
  TestDataQualityProviders,
  TestExternalProviders,
  TestHistoricalResultsProvider,
} from '../../../../../mock/test_providers/test_providers';
import { getHistoricalResultStub } from '../../../../../stub/get_historical_result_stub';

describe('HistoricalResults', () => {
  it('should render correctly', () => {
    const indexName = 'test';
    const historicalResult1 = getHistoricalResultStub(indexName);
    const historicalResult2 = {
      ...getHistoricalResultStub(indexName),
      checkedAt: historicalResult1.checkedAt + 1,
      '@timestamp': historicalResult1['@timestamp'] + 1,
    };
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <TestHistoricalResultsProvider
            historicalResultsState={{
              results: [historicalResult1, historicalResult2],
              isLoading: false,
              error: null,
              total: 1,
            }}
          >
            <HistoricalResults indexName={indexName} />
          </TestHistoricalResultsProvider>
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.getByTestId('historicalResults')).toBeInTheDocument();
    expect(
      screen.getByTestId(`historicalResult-${historicalResult1.checkedAt}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`historicalResult-${historicalResult2.checkedAt}`)
    ).toBeInTheDocument();
  });
});
