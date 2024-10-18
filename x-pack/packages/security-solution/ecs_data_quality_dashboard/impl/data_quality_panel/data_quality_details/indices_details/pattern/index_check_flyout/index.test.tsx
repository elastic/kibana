/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IndexCheckFlyout } from '.';
import {
  TestDataQualityProviders,
  TestExternalProviders,
  TestHistoricalResultsProvider,
} from '../../../../mock/test_providers/test_providers';
import { mockIlmExplain } from '../../../../mock/ilm_explain/mock_ilm_explain';
import { auditbeatWithAllResults } from '../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { mockStats } from '../../../../mock/stats/mock_stats';
import { mockHistoricalResult } from '../../../../mock/historical_results/mock_historical_results_response';
import { getFormattedCheckTime } from './utils/get_formatted_check_time';

describe('IndexCheckFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    beforeEach(() => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider>
              <IndexCheckFlyout
                initialSelectedTabId="latest_check"
                ilmExplain={mockIlmExplain}
                indexName="auditbeat-custom-index-1"
                onClose={jest.fn()}
                pattern="auditbeat-*"
                patternRollup={auditbeatWithAllResults}
                stats={mockStats}
                onDismissTour={jest.fn()}
                isTourActive={false}
              />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );
    });

    it('should render without crashing', () => {
      expect(screen.getByTestId('indexCheckFlyout')).toBeInTheDocument();
    });

    it('should render heading section correctly with formatted latest check time', () => {
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'auditbeat-custom-index-1'
      );
      expect(screen.getByTestId('latestCheckedAt')).toHaveTextContent(
        getFormattedCheckTime(
          auditbeatWithAllResults.results!['auditbeat-custom-index-1'].checkedAt!
        )
      );
    });

    it('should render tabs correctly, with latest check preselected', () => {
      expect(screen.getByRole('tab', { name: 'Latest Check' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByRole('tab', { name: 'Latest Check' })).not.toBeDisabled();
      expect(screen.getByRole('tab', { name: 'History' })).not.toBeDisabled();
    });

    it('should render the correct index properties panel', () => {
      expect(screen.getByTestId('indexStatsPanel')).toBeInTheDocument();
      expect(screen.getByTestId('latestCheckFields')).toBeInTheDocument();
    });

    it('should render footer with check now button', () => {
      expect(screen.getByRole('button', { name: 'Check now' })).toBeInTheDocument();
    });
  });

  describe('when flyout close is clicked', () => {
    it('should call onClose', async () => {
      const onClose = jest.fn();
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider>
              <IndexCheckFlyout
                ilmExplain={mockIlmExplain}
                indexName="auditbeat-custom-index-1"
                onClose={onClose}
                pattern="auditbeat-*"
                patternRollup={auditbeatWithAllResults}
                stats={mockStats}
                initialSelectedTabId="latest_check"
                isTourActive={false}
                onDismissTour={jest.fn()}
              />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const closeButton = screen.getByRole('button', { name: 'Close this dialog' });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('when check now button is clicked', () => {
    it('should call checkIndex', async () => {
      const checkIndex = jest.fn();
      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            indicesCheckContextProps={{
              checkIndex,
            }}
          >
            <TestHistoricalResultsProvider>
              <IndexCheckFlyout
                ilmExplain={mockIlmExplain}
                indexName="auditbeat-custom-index-1"
                onClose={jest.fn()}
                pattern="auditbeat-*"
                patternRollup={auditbeatWithAllResults}
                stats={mockStats}
                initialSelectedTabId="latest_check"
                isTourActive={false}
                onDismissTour={jest.fn()}
              />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const checkNowButton = screen.getByRole('button', { name: 'Check now' });
      await userEvent.click(checkNowButton);

      expect(checkIndex).toHaveBeenCalledWith({
        abortController: expect.any(AbortController),
        formatBytes: expect.any(Function),
        formatNumber: expect.any(Function),
        httpFetch: expect.any(Function),
        indexName: 'auditbeat-custom-index-1',
        pattern: 'auditbeat-*',
      });
    });
  });

  describe('when history tab is clicked', () => {
    it('should call fetchHistoricalResults and switch to history tab', async () => {
      const fetchHistoricalResults = jest.fn();

      const historicalResultsState = {
        results: [mockHistoricalResult],
        total: 1,
        isLoading: false,
        error: null,
      };

      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider
              historicalResultsState={historicalResultsState}
              fetchHistoricalResults={fetchHistoricalResults}
            >
              <IndexCheckFlyout
                ilmExplain={mockIlmExplain}
                indexName="auditbeat-custom-index-1"
                onClose={jest.fn()}
                pattern="auditbeat-*"
                patternRollup={auditbeatWithAllResults}
                stats={mockStats}
                initialSelectedTabId="latest_check"
                onDismissTour={jest.fn()}
                isTourActive={false}
              />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(screen.getByRole('tab', { name: 'Latest Check' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByRole('tab', { name: 'History' })).not.toHaveAttribute(
        'aria-selected',
        'true'
      );

      const historyTab = screen.getByRole('tab', { name: 'History' });
      await userEvent.click(historyTab);

      expect(fetchHistoricalResults).toHaveBeenCalledWith({
        indexName: 'auditbeat-custom-index-1',
        abortController: expect.any(AbortController),
      });

      expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Latest Check' })).not.toHaveAttribute(
        'aria-selected',
        'true'
      );

      expect(screen.getByTestId('historicalResults')).toBeInTheDocument();
    });
  });

  describe('Tour guide', () => {
    describe('when in Latest Check tab and isTourActive', () => {
      it('should render the tour guide near history tab with proper data-tour-element attribute', async () => {
        const pattern = 'auditbeat-*';
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <TestHistoricalResultsProvider>
                <IndexCheckFlyout
                  ilmExplain={mockIlmExplain}
                  indexName="auditbeat-custom-index-1"
                  onClose={jest.fn()}
                  pattern={pattern}
                  patternRollup={auditbeatWithAllResults}
                  stats={mockStats}
                  initialSelectedTabId="latest_check"
                  onDismissTour={jest.fn()}
                  isTourActive={true}
                />
              </TestHistoricalResultsProvider>
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const historyTab = screen.getByRole('tab', { name: 'History' });
        const latestCheckTab = screen.getByRole('tab', { name: 'Latest Check' });

        expect(historyTab).toHaveAttribute('data-tour-element', `${pattern}-history-tab`);
        expect(latestCheckTab).not.toHaveAttribute('data-tour-element', `${pattern}-history-tab`);
        await waitFor(() =>
          expect(historyTab.closest('[data-test-subj="historicalResultsTour"]')).toBeInTheDocument()
        );
        expect(
          screen.getByRole('dialog', { name: 'Introducing data quality history' })
        ).toBeInTheDocument();
      });

      describe('when the tour close button is clicked', () => {
        it('should invoke the dismiss tour callback', async () => {
          const onDismissTour = jest.fn();
          render(
            <TestExternalProviders>
              <TestDataQualityProviders>
                <TestHistoricalResultsProvider>
                  <IndexCheckFlyout
                    ilmExplain={mockIlmExplain}
                    indexName="auditbeat-custom-index-1"
                    onClose={jest.fn()}
                    pattern="auditbeat-*"
                    patternRollup={auditbeatWithAllResults}
                    stats={mockStats}
                    initialSelectedTabId="latest_check"
                    onDismissTour={onDismissTour}
                    isTourActive={true}
                  />
                </TestHistoricalResultsProvider>
              </TestDataQualityProviders>
            </TestExternalProviders>
          );

          const dialogWrapper = await screen.findByRole('dialog', {
            name: 'Introducing data quality history',
          });

          const closeButton = within(dialogWrapper).getByRole('button', { name: 'Close' });
          await userEvent.click(closeButton);

          expect(onDismissTour).toHaveBeenCalled();
        });
      });

      describe('when the tour TryIt button is clicked', () => {
        it('should switch to history tab and invoke onDismissTour', async () => {
          const onDismissTour = jest.fn();
          render(
            <TestExternalProviders>
              <TestDataQualityProviders>
                <TestHistoricalResultsProvider>
                  <IndexCheckFlyout
                    ilmExplain={mockIlmExplain}
                    indexName="auditbeat-custom-index-1"
                    onClose={jest.fn()}
                    pattern="auditbeat-*"
                    patternRollup={auditbeatWithAllResults}
                    stats={mockStats}
                    initialSelectedTabId="latest_check"
                    onDismissTour={onDismissTour}
                    isTourActive={true}
                  />
                </TestHistoricalResultsProvider>
              </TestDataQualityProviders>
            </TestExternalProviders>
          );

          const dialogWrapper = await screen.findByRole('dialog', {
            name: 'Introducing data quality history',
          });

          const tryItButton = within(dialogWrapper).getByRole('button', { name: 'Try it' });
          await userEvent.click(tryItButton);

          expect(onDismissTour).toHaveBeenCalled();
          expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute(
            'aria-selected',
            'true'
          );

          expect(onDismissTour).toHaveBeenCalled();
        });
      });

      describe('when manually switching to history tab', () => {
        it('should invoke onDismissTour', async () => {
          const onDismissTour = jest.fn();
          render(
            <TestExternalProviders>
              <TestDataQualityProviders>
                <TestHistoricalResultsProvider>
                  <IndexCheckFlyout
                    ilmExplain={mockIlmExplain}
                    indexName="auditbeat-custom-index-1"
                    onClose={jest.fn()}
                    pattern="auditbeat-*"
                    patternRollup={auditbeatWithAllResults}
                    stats={mockStats}
                    initialSelectedTabId="latest_check"
                    onDismissTour={onDismissTour}
                    isTourActive={true}
                  />
                </TestHistoricalResultsProvider>
              </TestDataQualityProviders>
            </TestExternalProviders>
          );

          const historyTab = screen.getByRole('tab', { name: 'History' });
          await userEvent.click(historyTab);

          expect(onDismissTour).toHaveBeenCalled();
        });
      });
    });

    describe('when not isTourActive', () => {
      it('should not render the tour guide', async () => {
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <TestHistoricalResultsProvider>
                <IndexCheckFlyout
                  ilmExplain={mockIlmExplain}
                  indexName="auditbeat-custom-index-1"
                  onClose={jest.fn()}
                  pattern="auditbeat-*"
                  patternRollup={auditbeatWithAllResults}
                  stats={mockStats}
                  initialSelectedTabId="latest_check"
                  onDismissTour={jest.fn()}
                  isTourActive={false}
                />
              </TestHistoricalResultsProvider>
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        await waitFor(() =>
          expect(screen.queryByTestId('historicalResultsTour')).not.toBeInTheDocument()
        );

        expect(
          screen.queryByRole('dialog', { name: 'Introducing data quality history' })
        ).not.toBeInTheDocument();
      });
    });
  });
});
