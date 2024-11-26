/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HistoricalResults } from '.';
import { screen, render, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  TestDataQualityProviders,
  TestExternalProviders,
  TestHistoricalResultsProvider,
} from '../../../../../mock/test_providers/test_providers';
import { getHistoricalResultStub } from '../../../../../stub/get_historical_result_stub';
import { ERROR_LOADING_HISTORICAL_RESULTS, LOADING_HISTORICAL_RESULTS } from './translations';
import { generateHistoricalResultsStub } from '../../../../../stub/generate_historical_results_stub';

describe('HistoricalResults', () => {
  it('should render historical results list', () => {
    const indexName = 'test';
    const results = generateHistoricalResultsStub(indexName, 2);
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <TestHistoricalResultsProvider
            historicalResultsState={{
              results,
              isLoading: false,
              error: null,
              total: results.length,
            }}
          >
            <HistoricalResults indexName={indexName} />
          </TestHistoricalResultsProvider>
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.getByTestId('historicalResultsTotalChecks')).toBeInTheDocument();
    expect(screen.getByTestId('historicalResultsList')).toBeInTheDocument();
  });

  describe('Outcome Filter', () => {
    it('should render outcome filters block with no specific outcome preselected', () => {
      const indexName = 'test';
      const historicalResult = getHistoricalResultStub(indexName);
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider
              historicalResultsState={{
                results: [historicalResult],
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

      expect(screen.getByTestId('historicalResultsOutcomeFilterGroup')).toBeInTheDocument();
      const outcomeFilterAll = screen.getByTestId('historicalResultsOutcomeFilterAll');

      expect(outcomeFilterAll).toBeInTheDocument();
      expect(outcomeFilterAll).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe.each(['All', 'Pass', 'Fail'])('when %s outcome filter is clicked', (outcome) => {
    it(`should invoke fetchHistoricalResults with ${outcome} outcome, from: 0 and remaining fetch query opts`, async () => {
      const indexName = 'test';
      const historicalResult = getHistoricalResultStub(indexName);
      const fetchHistoricalResults = jest.fn();
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider
              historicalResultsState={{
                results: [historicalResult],
                isLoading: false,
                error: null,
                total: 1,
              }}
              fetchHistoricalResults={fetchHistoricalResults}
            >
              <HistoricalResults indexName={indexName} />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const outcomeFilter = screen.getByTestId(`historicalResultsOutcomeFilter${outcome}`);
      await act(async () => outcomeFilter.click());

      const fetchQueryOpts = {
        abortController: expect.any(AbortController),
        indexName,
        size: expect.any(Number),
        startDate: expect.any(String),
        endDate: expect.any(String),
      };

      expect(fetchHistoricalResults).toHaveBeenCalledWith(
        expect.objectContaining({
          ...fetchQueryOpts,
          from: 0,
          ...(outcome !== 'All' && { outcome: outcome.toLowerCase() }),
        })
      );
    });
  });

  describe('Super Date Picker', () => {
    it('should render superdatepicker with last 30 days preselected', () => {
      const indexName = 'test';
      const historicalResult = getHistoricalResultStub(indexName);
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider
              historicalResultsState={{
                results: [historicalResult],
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

      const superDatePicker = screen.getByTestId('historicalResultsDatePicker');
      expect(
        within(superDatePicker).getByTestId('superDatePickerToggleQuickMenuButton')
      ).toBeInTheDocument();
      expect(
        within(superDatePicker).getByTestId('superDatePickerShowDatesButton')
      ).toHaveTextContent('Last 30 days');
      expect(
        within(superDatePicker).getByTestId('superDatePickerApplyTimeButton')
      ).toBeInTheDocument();
    });

    describe('when new date is selected', () => {
      it('should invoke fetchHistoricalResults with new start and end dates, from: 0 and remaining fetch query opts', async () => {
        const indexName = 'test';
        const historicalResult = getHistoricalResultStub(indexName);
        const fetchHistoricalResults = jest.fn();
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <TestHistoricalResultsProvider
                historicalResultsState={{
                  results: [historicalResult],
                  isLoading: false,
                  error: null,
                  total: 1,
                }}
                fetchHistoricalResults={fetchHistoricalResults}
              >
                <HistoricalResults indexName={indexName} />
              </TestHistoricalResultsProvider>
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const superDatePicker = screen.getByTestId('historicalResultsDatePicker');

        await act(async () => {
          const dateQuickSelect = within(superDatePicker).getByTestId(
            'superDatePickerToggleQuickMenuButton'
          );
          await userEvent.click(dateQuickSelect);
        });

        await act(async () => {
          const monthToDateButton = screen.getByTestId('superDatePickerCommonlyUsed_Month_to date');

          await userEvent.click(monthToDateButton);
        });

        const fetchQueryOpts = {
          abortController: expect.any(AbortController),
          indexName,
          size: expect.any(Number),
        };

        expect(fetchHistoricalResults).toHaveBeenCalledWith(
          expect.objectContaining({
            ...fetchQueryOpts,
            from: 0,
            startDate: 'now/M',
            endDate: 'now',
          })
        );
      });
    });
  });

  describe('Pagination', () => {
    describe('by default', () => {
      it('should show rows per page: 10 by default', () => {
        const indexName = 'test';
        const results = generateHistoricalResultsStub(indexName, 11);
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <TestHistoricalResultsProvider
                historicalResultsState={{
                  results,
                  isLoading: false,
                  error: null,
                  total: results.length,
                }}
              >
                <HistoricalResults indexName={indexName} />
              </TestHistoricalResultsProvider>
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const wrapper = screen.getByTestId('historicalResultsPagination');

        expect(within(wrapper).getByTestId('tablePaginationPopoverButton')).toHaveTextContent(
          'Rows per page: 10'
        );
      });
    });

    describe('when rows per page are clicked', () => {
      it('should show 10, 25, 50 rows per page options', async () => {
        const indexName = 'test';
        const results = generateHistoricalResultsStub(indexName, 11);
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <TestHistoricalResultsProvider
                historicalResultsState={{
                  results,
                  isLoading: false,
                  error: null,
                  total: results.length,
                }}
              >
                <HistoricalResults indexName={indexName} />
              </TestHistoricalResultsProvider>
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const wrapper = screen.getByTestId('historicalResultsPagination');

        await act(async () =>
          userEvent.click(within(wrapper).getByTestId('tablePaginationPopoverButton'))
        );

        expect(screen.getByTestId('tablePagination-10-rows')).toBeInTheDocument();
        expect(screen.getByTestId('tablePagination-25-rows')).toBeInTheDocument();
        expect(screen.getByTestId('tablePagination-50-rows')).toBeInTheDocument();
      });
    });

    describe('when total results are more than or equal 1 page', () => {
      it('should render pagination', () => {
        const indexName = 'test';
        const results = generateHistoricalResultsStub(indexName, 11);
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <TestHistoricalResultsProvider
                historicalResultsState={{
                  results,
                  isLoading: false,
                  error: null,
                  total: results.length,
                }}
              >
                <HistoricalResults indexName={indexName} />
              </TestHistoricalResultsProvider>
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const wrapper = screen.getByTestId('historicalResultsPagination');
        expect(within(wrapper).getByTestId('historicalResultsTablePagination')).toBeInTheDocument();
      });
    });

    describe('when total results are less than 1 page', () => {
      it('should not render pagination', async () => {
        const indexName = 'test';
        const results = generateHistoricalResultsStub(indexName, 9);
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <TestHistoricalResultsProvider
                historicalResultsState={{
                  results,
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

        await waitFor(() => {
          expect(screen.queryByTestId('historicalResultsPagination')).not.toBeInTheDocument();
        });
      });
    });

    describe('when new page is clicked', () => {
      it('should invoke fetchHistoricalResults with new from and remaining fetch query opts', async () => {
        const indexName = 'test';
        const results = generateHistoricalResultsStub(indexName, 11);
        const fetchHistoricalResults = jest.fn();
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <TestHistoricalResultsProvider
                historicalResultsState={{
                  results,
                  isLoading: false,
                  error: null,
                  total: results.length,
                }}
                fetchHistoricalResults={fetchHistoricalResults}
              >
                <HistoricalResults indexName={indexName} />
              </TestHistoricalResultsProvider>
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const wrapper = screen.getByTestId('historicalResultsPagination');

        await act(() => userEvent.click(within(wrapper).getByTestId('pagination-button-1')));

        const fetchQueryOpts = {
          abortController: expect.any(AbortController),
          indexName,
          size: expect.any(Number),
          startDate: expect.any(String),
          endDate: expect.any(String),
        };

        expect(fetchHistoricalResults).toHaveBeenCalledWith(
          expect.objectContaining({
            ...fetchQueryOpts,
            from: 10,
          })
        );
      });
    });

    describe('when items per page is changed', () => {
      it('should invoke fetchHistoricalResults with new size, from: 0 and remaining fetch query opts', async () => {
        const indexName = 'test';
        const results = generateHistoricalResultsStub(indexName, 11);
        const fetchHistoricalResults = jest.fn();
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <TestHistoricalResultsProvider
                historicalResultsState={{
                  results,
                  isLoading: false,
                  error: null,
                  total: results.length,
                }}
                fetchHistoricalResults={fetchHistoricalResults}
              >
                <HistoricalResults indexName={indexName} />
              </TestHistoricalResultsProvider>
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const wrapper = screen.getByTestId('historicalResultsPagination');

        await act(() =>
          userEvent.click(within(wrapper).getByTestId('tablePaginationPopoverButton'))
        );

        await act(() => userEvent.click(screen.getByTestId('tablePagination-25-rows')));

        const fetchQueryOpts = {
          abortController: expect.any(AbortController),
          indexName,
          from: 0,
          startDate: expect.any(String),
          endDate: expect.any(String),
        };

        expect(fetchHistoricalResults).toHaveBeenCalledWith(
          expect.objectContaining({
            ...fetchQueryOpts,
            size: 25,
          })
        );
      });
    });
  });

  describe('when historical results are loading', () => {
    it('should show loading screen', () => {
      const indexName = 'test';
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider
              historicalResultsState={{
                results: [],
                isLoading: true,
                error: null,
                total: 0,
              }}
            >
              <HistoricalResults indexName={indexName} />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(screen.getByText(LOADING_HISTORICAL_RESULTS)).toBeInTheDocument();
      expect(screen.queryByTestId('historicalResults')).not.toBeInTheDocument();
    });
  });

  describe('when historical results return error', () => {
    it('should show error message', () => {
      const indexName = 'test';
      const errorMessage = new Error('An error occurred');
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider
              historicalResultsState={{
                results: [],
                isLoading: false,
                error: errorMessage,
                total: 0,
              }}
            >
              <HistoricalResults indexName={indexName} />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(screen.getByText(ERROR_LOADING_HISTORICAL_RESULTS)).toBeInTheDocument();
    });
  });
});
