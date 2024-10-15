/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';

import { HistoricalResult } from '.';
import {
  getHistoricalResultStub,
  getLegacyHistoricalResultStub,
} from '../../../../../../../stub/get_historical_result_stub';
import {
  TestDataQualityProviders,
  TestExternalProviders,
  TestHistoricalResultsProvider,
} from '../../../../../../../mock/test_providers/test_providers';

describe('HisoricalResult', () => {
  it('should render extended index stats panel', () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <TestHistoricalResultsProvider>
            <HistoricalResult indexName="test" historicalResult={getHistoricalResultStub('test')} />
          </TestHistoricalResultsProvider>
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    const wrapper = screen.getByTestId('indexStatsPanel');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.textContent).toBe(
      'Docs618,675ILM phaseunmanagedSize81.2MBCustom fields64ECS compliant fields44All fields112'
    );
  });

  it('should render historical check fields', () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <TestHistoricalResultsProvider>
            <HistoricalResult indexName="test" historicalResult={getHistoricalResultStub('test')} />
          </TestHistoricalResultsProvider>
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    const wrapper = screen.getByTestId('historicalCheckFields');
    expect(wrapper).toBeInTheDocument();
  });

  describe('when historical result is legacy', () => {
    it('should render legacy historical check fields', () => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider>
              <HistoricalResult
                indexName="test"
                historicalResult={getLegacyHistoricalResultStub('test')}
              />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const wrapper = screen.getByTestId('legacyHistoricalCheckFields');
      expect(wrapper).toBeInTheDocument();
    });
  });
});
