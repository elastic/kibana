/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  TestDataQualityProviders,
  TestExternalProviders,
  TestHistoricalResultsProvider,
} from '../../../../../../../../mock/test_providers/test_providers';
import { getHistoricalResultStub } from '../../../../../../../../stub/get_historical_result_stub';
import { HistoricalCheckFields } from '.';

describe('HistoricalCheckFields', () => {
  it('should render incompatible (preselected) and same family field tabs', () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <TestHistoricalResultsProvider>
            <HistoricalCheckFields
              indexName="test"
              historicalResult={getHistoricalResultStub('test')}
            />
          </TestHistoricalResultsProvider>
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.getByTestId('incompatibleTab')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('sameFamilyTab')).toHaveAttribute('aria-pressed', 'false');

    expect(screen.getByTestId('incompatibleTabContent')).toBeInTheDocument();
    expect(screen.queryByTestId('sameFamilyTabContent')).not.toBeInTheDocument();
  });

  describe('when clicking on tabs', () => {
    it('should render respective tab content', async () => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider>
              <HistoricalCheckFields
                indexName="test"
                historicalResult={getHistoricalResultStub('test')}
              />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(screen.getByTestId('incompatibleTab')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('sameFamilyTab')).toHaveAttribute('aria-pressed', 'false');

      expect(screen.getByTestId('incompatibleTabContent')).toBeInTheDocument();
      expect(screen.queryByTestId('sameFamilyTabContent')).not.toBeInTheDocument();

      await act(async () => userEvent.click(screen.getByTestId('sameFamilyTab')));

      expect(screen.getByTestId('incompatibleTab')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('sameFamilyTab')).toHaveAttribute('aria-pressed', 'true');

      expect(screen.queryByTestId('incompatibleTabContent')).not.toBeInTheDocument();
      expect(screen.getByTestId('sameFamilyTabContent')).toBeInTheDocument();

      await act(async () => userEvent.click(screen.getByTestId('incompatibleTab')));

      expect(screen.getByTestId('incompatibleTab')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('sameFamilyTab')).toHaveAttribute('aria-pressed', 'false');

      expect(screen.getByTestId('incompatibleTabContent')).toBeInTheDocument();
      expect(screen.queryByTestId('sameFamilyTabContent')).not.toBeInTheDocument();
    });
  });
});
