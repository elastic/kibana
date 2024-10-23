/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';

import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../../mock/test_providers/test_providers';
import { Pattern } from '.';
import {
  auditbeatWithAllResults,
  emptyAuditbeatPatternRollup,
} from '../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { useIlmExplain } from './hooks/use_ilm_explain';
import { useStats } from './hooks/use_stats';
import { ERROR_LOADING_METADATA_TITLE, LOADING_STATS } from './translations';
import { useHistoricalResults } from './hooks/use_historical_results';
import { getHistoricalResultStub } from '../../../stub/get_historical_result_stub';
import userEvent from '@testing-library/user-event';

const pattern = 'auditbeat-*';

jest.mock('./hooks/use_stats', () => ({
  ...jest.requireActual('./hooks/use_stats'),
  useStats: jest.fn(() => ({
    stats: {},
    error: null,
    loading: false,
  })),
}));

jest.mock('./hooks/use_ilm_explain', () => ({
  ...jest.requireActual('./hooks/use_ilm_explain'),
  useIlmExplain: jest.fn(() => ({
    error: null,
    ilmExplain: {},
    loading: false,
  })),
}));

jest.mock('./hooks/use_historical_results', () => ({
  ...jest.requireActual('./hooks/use_historical_results'),
  useHistoricalResults: jest.fn(() => ({
    historicalResultsState: {
      results: [],
      total: 0,
      isLoading: true,
      error: null,
    },
    fetchHistoricalResults: jest.fn(),
  })),
}));

describe('pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('renders the initially open accordion with the pattern data and summary table', () => {
    (useIlmExplain as jest.Mock).mockReturnValue({
      error: null,
      ilmExplain: auditbeatWithAllResults.ilmExplain,
      loading: false,
    });

    (useStats as jest.Mock).mockReturnValue({
      stats: auditbeatWithAllResults.stats,
      error: null,
      loading: false,
    });

    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <Pattern
            patternRollup={auditbeatWithAllResults}
            chartSelectedIndex={null}
            setChartSelectedIndex={jest.fn()}
            indexNames={Object.keys(auditbeatWithAllResults.stats!)}
            pattern={pattern}
            isTourActive={false}
            onDismissTour={jest.fn()}
            isFirstOpenNonEmptyPattern={false}
            onAccordionToggle={jest.fn()}
          />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    const accordionToggle = screen.getByRole('button', {
      name: 'Fail auditbeat-* hot (1) unmanaged (2) Incompatible fields 4 Indices checked 3 Indices 3 Size 17.9MB Docs 19,127',
    });

    expect(accordionToggle).toBeInTheDocument();
    expect(accordionToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('summaryTable')).toBeInTheDocument();
  });

  describe('onAccordionToggle', () => {
    describe('by default', () => {
      describe('when no summary table items are available', () => {
        it('invokes the onAccordionToggle function with the pattern name, isOpen as true and isEmpty as true', async () => {
          const onAccordionToggle = jest.fn();

          (useIlmExplain as jest.Mock).mockReturnValue({
            error: null,
            ilmExplain: null,
            loading: false,
          });

          (useStats as jest.Mock).mockReturnValue({
            stats: null,
            error: null,
            loading: false,
          });

          render(
            <TestExternalProviders>
              <TestDataQualityProviders>
                <Pattern
                  patternRollup={emptyAuditbeatPatternRollup}
                  chartSelectedIndex={null}
                  setChartSelectedIndex={jest.fn()}
                  indexNames={[]}
                  pattern={pattern}
                  isTourActive={false}
                  onDismissTour={jest.fn()}
                  isFirstOpenNonEmptyPattern={false}
                  onAccordionToggle={onAccordionToggle}
                />
              </TestDataQualityProviders>
            </TestExternalProviders>
          );

          const accordionToggle = await screen.findByRole('button', {
            name: 'auditbeat-* Incompatible fields 0 Indices checked 0 Indices 0 Size 0B Docs 0',
          });

          expect(onAccordionToggle).toHaveBeenCalledTimes(1);

          await userEvent.click(accordionToggle);

          expect(onAccordionToggle).toHaveBeenCalledTimes(2);
          expect(onAccordionToggle).toHaveBeenCalledWith(pattern, true, true);
        });
      });

      describe('when summary table items are available', () => {
        it('invokes the onAccordionToggle function with the pattern name, isOpen as true and isEmpty as false', async () => {
          const onAccordionToggle = jest.fn();

          (useIlmExplain as jest.Mock).mockReturnValue({
            error: null,
            ilmExplain: auditbeatWithAllResults.ilmExplain,
            loading: false,
          });

          (useStats as jest.Mock).mockReturnValue({
            stats: auditbeatWithAllResults.stats,
            error: null,
            loading: false,
          });

          render(
            <TestExternalProviders>
              <TestDataQualityProviders>
                <Pattern
                  patternRollup={auditbeatWithAllResults}
                  chartSelectedIndex={null}
                  setChartSelectedIndex={jest.fn()}
                  indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                  pattern={pattern}
                  isTourActive={false}
                  onDismissTour={jest.fn()}
                  isFirstOpenNonEmptyPattern={false}
                  onAccordionToggle={onAccordionToggle}
                />
              </TestDataQualityProviders>
            </TestExternalProviders>
          );

          const accordionToggle = screen.getByRole('button', {
            name: 'Fail auditbeat-* hot (1) unmanaged (2) Incompatible fields 4 Indices checked 3 Indices 3 Size 17.9MB Docs 19,127',
          });

          expect(onAccordionToggle).toHaveBeenCalledTimes(1);

          await userEvent.click(accordionToggle);

          expect(onAccordionToggle).toHaveBeenCalledTimes(2);
          expect(onAccordionToggle).toHaveBeenCalledWith(pattern, true, false);
        });
      });
    });

    describe('when the accordion is toggled', () => {
      it('calls the onAccordionToggle function with current open state and current empty state', async () => {
        const onAccordionToggle = jest.fn();

        (useIlmExplain as jest.Mock).mockReturnValue({
          error: null,
          ilmExplain: auditbeatWithAllResults.ilmExplain,
          loading: false,
        });

        (useStats as jest.Mock).mockReturnValue({
          stats: auditbeatWithAllResults.stats,
          error: null,
          loading: false,
        });

        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={onAccordionToggle}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const accordionToggle = screen.getByRole('button', {
          name: 'Fail auditbeat-* hot (1) unmanaged (2) Incompatible fields 4 Indices checked 3 Indices 3 Size 17.9MB Docs 19,127',
        });

        expect(onAccordionToggle).toHaveBeenCalledTimes(1);
        expect(onAccordionToggle).toHaveBeenCalledWith(pattern, true, false);

        await userEvent.click(accordionToggle);

        expect(onAccordionToggle).toHaveBeenCalledTimes(2);
        expect(onAccordionToggle).toHaveBeenLastCalledWith(pattern, false, false);

        await userEvent.click(accordionToggle);

        expect(onAccordionToggle).toHaveBeenCalledTimes(3);
        expect(onAccordionToggle).toHaveBeenCalledWith(pattern, true, false);
      });
    });
  });

  describe('remote clusters callout', () => {
    describe('when the pattern includes a colon', () => {
      it('it renders the remote clusters callout', () => {
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={undefined}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={undefined}
                pattern={'remote:*'}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        expect(screen.getByTestId('remoteClustersCallout')).toBeInTheDocument();
      });
    });

    describe('when the pattern does NOT include a colon', () => {
      it('it does NOT render the remote clusters callout', () => {
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={undefined}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={undefined}
                pattern={pattern}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        expect(screen.queryByTestId('remoteClustersCallout')).not.toBeInTheDocument();
      });
    });
  });

  describe('loading & error', () => {
    describe('when useStats returns error', () => {
      it('renders the error message', () => {
        (useStats as jest.Mock).mockReturnValue({
          stats: {},
          error: 'An error occurred',
          loading: false,
        });

        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        expect(screen.getByText(ERROR_LOADING_METADATA_TITLE(pattern))).toBeInTheDocument();
        expect(screen.queryByTestId('summaryTable')).not.toBeInTheDocument();
      });
    });

    describe('when useIlmExplain returns error', () => {
      it('renders the error message', () => {
        (useIlmExplain as jest.Mock).mockReturnValue({
          error: 'An error occurred',
          ilmExplain: {},
          loading: false,
        });

        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        expect(screen.getByText(ERROR_LOADING_METADATA_TITLE(pattern))).toBeInTheDocument();
        expect(screen.queryByTestId('summaryTable')).not.toBeInTheDocument();
      });
    });

    describe('when useStats is loading but useIlmExplan returns error', () => {
      it('renders the loading message', () => {
        (useStats as jest.Mock).mockReturnValue({
          stats: {},
          error: null,
          loading: true,
        });

        (useIlmExplain as jest.Mock).mockReturnValue({
          error: 'An error occurred',
          ilmExplain: {},
          loading: false,
        });

        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        expect(screen.getByText(LOADING_STATS)).toBeInTheDocument();
        expect(screen.queryByTestId('summaryTable')).not.toBeInTheDocument();
      });
    });

    describe('when useIlmExplain is loading but useStats returns error', () => {
      it('renders the loading message', () => {
        (useStats as jest.Mock).mockReturnValue({
          stats: {},
          error: 'An error occurred',
          loading: false,
        });

        (useIlmExplain as jest.Mock).mockReturnValue({
          error: null,
          ilmExplain: {},
          loading: true,
        });

        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        expect(screen.getByText(LOADING_STATS)).toBeInTheDocument();
        expect(screen.queryByTestId('summaryTable')).not.toBeInTheDocument();
      });
    });
  });

  describe('Flyout', () => {
    describe('when the check now action is clicked', () => {
      it('calls the checkIndex function and opens flyout with latest check tab', async () => {
        const indexName = '.ds-auditbeat-8.6.1-2023.02.07-000001';
        // arrange
        (useIlmExplain as jest.Mock).mockReturnValue({
          error: null,
          ilmExplain: auditbeatWithAllResults.ilmExplain,
          loading: false,
        });

        (useStats as jest.Mock).mockReturnValue({
          stats: auditbeatWithAllResults.stats,
          error: null,
          loading: false,
        });

        const checkIndex = jest.fn();

        // act
        render(
          <TestExternalProviders>
            <TestDataQualityProviders
              indicesCheckContextProps={{
                checkIndex,
              }}
            >
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const rows = screen.getAllByRole('row');
        const firstBodyRow = within(rows[1]);

        expect(screen.queryByTestId('indexCheckFlyout')).not.toBeInTheDocument();

        const checkNowButton = firstBodyRow.getByRole('button', {
          name: 'Check now',
        });

        await userEvent.click(checkNowButton);

        // assert
        expect(checkIndex).toHaveBeenCalledTimes(1);
        expect(checkIndex).toHaveBeenCalledWith({
          abortController: expect.any(AbortController),
          formatBytes: expect.any(Function),
          formatNumber: expect.any(Function),
          httpFetch: expect.any(Function),
          indexName,
          pattern,
        });
        expect(screen.getByTestId('indexCheckFlyout')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Latest Check' })).toHaveAttribute(
          'aria-selected',
          'true'
        );
        expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute(
          'aria-selected',
          'false'
        );
        expect(screen.getByTestId('latestResults')).toBeInTheDocument();
        expect(screen.queryByTestId('historicalResults')).not.toBeInTheDocument();
      });
    });

    describe('when the view history action is clicked', () => {
      it('calls the fetchHistoricalResults function and opens flyout with history check tab', async () => {
        const indexName = '.ds-auditbeat-8.6.1-2023.02.07-000001';
        // arrange
        (useIlmExplain as jest.Mock).mockReturnValue({
          error: null,
          ilmExplain: auditbeatWithAllResults.ilmExplain,
          loading: false,
        });

        (useStats as jest.Mock).mockReturnValue({
          stats: auditbeatWithAllResults.stats,
          error: null,
          loading: false,
        });

        const fetchHistoricalResults = jest.fn();

        (useHistoricalResults as jest.Mock).mockReturnValue({
          historicalResultsState: {
            results: [getHistoricalResultStub(indexName)],
            total: 1,
            isLoading: false,
            error: null,
          },
          fetchHistoricalResults,
        });

        // act
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const rows = screen.getAllByRole('row');
        const firstBodyRow = within(rows[1]);

        expect(screen.queryByTestId('indexCheckFlyout')).not.toBeInTheDocument();

        const viewHistoryButton = firstBodyRow.getByRole('button', {
          name: 'View history',
        });

        await userEvent.click(viewHistoryButton);

        // assert
        expect(fetchHistoricalResults).toHaveBeenCalledTimes(1);
        expect(fetchHistoricalResults).toHaveBeenCalledWith({
          abortController: expect.any(AbortController),
          indexName,
        });
        expect(screen.getByTestId('indexCheckFlyout')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Latest Check' })).toHaveAttribute(
          'aria-selected',
          'false'
        );
        expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute(
          'aria-selected',
          'true'
        );
        expect(screen.queryByTestId('latestResults')).not.toBeInTheDocument();
        expect(screen.getByTestId('historicalResults')).toBeInTheDocument();
      });
    });

    describe('when the close button is clicked', () => {
      it('closes the flyout', async () => {
        const indexName = '.ds-auditbeat-8.6.1-2023.02.07-000001';
        // arrange
        (useIlmExplain as jest.Mock).mockReturnValue({
          error: null,
          ilmExplain: auditbeatWithAllResults.ilmExplain,
          loading: false,
        });

        (useStats as jest.Mock).mockReturnValue({
          stats: auditbeatWithAllResults.stats,
          error: null,
          loading: false,
        });

        const fetchHistoricalResults = jest.fn();

        (useHistoricalResults as jest.Mock).mockReturnValue({
          historicalResultsState: {
            results: [getHistoricalResultStub(indexName)],
            total: 1,
            isLoading: false,
            error: null,
          },
          fetchHistoricalResults,
        });

        // act
        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const rows = screen.getAllByRole('row');
        const firstBodyRow = within(rows[1]);

        expect(screen.queryByTestId('indexCheckFlyout')).not.toBeInTheDocument();

        const viewHistoryButton = firstBodyRow.getByRole('button', {
          name: 'View history',
        });

        await userEvent.click(viewHistoryButton);

        const closeButton = screen.getByRole('button', { name: 'Close this dialog' });

        await userEvent.click(closeButton);

        // assert
        expect(screen.queryByTestId('indexCheckFlyout')).not.toBeInTheDocument();
      }, 15000);
    });

    describe('when chartSelectedIndex is set', () => {
      it('invokes the checkIndex function with the selected index and opens flyout', async () => {
        const indexName = '.ds-auditbeat-8.6.1-2023.02.07-000001';
        // arrange
        (useIlmExplain as jest.Mock).mockReturnValue({
          error: null,
          ilmExplain: auditbeatWithAllResults.ilmExplain,
          loading: false,
        });

        (useStats as jest.Mock).mockReturnValue({
          stats: auditbeatWithAllResults.stats,
          error: null,
          loading: false,
        });

        const checkIndex = jest.fn();

        // act
        render(
          <TestExternalProviders>
            <TestDataQualityProviders
              indicesCheckContextProps={{
                checkIndex,
              }}
            >
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={{
                  indexName,
                  pattern,
                }}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        // assert
        expect(checkIndex).toHaveBeenCalledTimes(1);
        expect(checkIndex).toHaveBeenCalledWith({
          abortController: expect.any(AbortController),
          formatBytes: expect.any(Function),
          formatNumber: expect.any(Function),
          httpFetch: expect.any(Function),
          indexName,
          pattern,
        });
        expect(screen.getByTestId('indexCheckFlyout')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Latest Check' })).toHaveAttribute(
          'aria-selected',
          'true'
        );
        expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute(
          'aria-selected',
          'false'
        );
        expect(screen.getByTestId('latestResults')).toBeInTheDocument();
        expect(screen.queryByTestId('historicalResults')).not.toBeInTheDocument();
      });
    });
  });

  describe('Tour', () => {
    describe('when isTourActive and isFirstOpenNonEmptyPattern', () => {
      it('renders the tour near the first row history view button', async () => {
        (useIlmExplain as jest.Mock).mockReturnValue({
          error: null,
          ilmExplain: auditbeatWithAllResults.ilmExplain,
          loading: false,
        });

        (useStats as jest.Mock).mockReturnValue({
          stats: auditbeatWithAllResults.stats,
          error: null,
          loading: false,
        });

        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={true}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={true}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        const rows = screen.getAllByRole('row');
        // skipping the first row which is the header
        const firstBodyRow = within(rows[1]);

        const tourWrapper = await firstBodyRow.findByTestId('historicalResultsTour');

        expect(
          within(tourWrapper).getByRole('button', { name: 'View history' })
        ).toBeInTheDocument();

        expect(
          screen.getByRole('dialog', { name: 'Introducing data quality history' })
        ).toBeInTheDocument();
      });

      describe('when accordion is collapsed', () => {
        it('hides the tour', async () => {
          (useIlmExplain as jest.Mock).mockReturnValue({
            error: null,
            ilmExplain: auditbeatWithAllResults.ilmExplain,
            loading: false,
          });

          (useStats as jest.Mock).mockReturnValue({
            stats: auditbeatWithAllResults.stats,
            error: null,
            loading: false,
          });

          render(
            <TestExternalProviders>
              <TestDataQualityProviders>
                <Pattern
                  patternRollup={auditbeatWithAllResults}
                  chartSelectedIndex={null}
                  setChartSelectedIndex={jest.fn()}
                  indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                  pattern={pattern}
                  isTourActive={true}
                  onDismissTour={jest.fn()}
                  isFirstOpenNonEmptyPattern={true}
                  onAccordionToggle={jest.fn()}
                />
              </TestDataQualityProviders>
            </TestExternalProviders>
          );

          expect(await screen.findByTestId('historicalResultsTour')).toBeInTheDocument();

          const accordionToggle = screen.getByRole('button', {
            name: 'Fail auditbeat-* hot (1) unmanaged (2) Incompatible fields 4 Indices checked 3 Indices 3 Size 17.9MB Docs 19,127',
          });

          await userEvent.click(accordionToggle);

          expect(screen.queryByTestId('historicalResultsTour')).not.toBeInTheDocument();
        }, 10000);
      });

      describe('when the tour close button is clicked', () => {
        it('invokes onDismissTour', async () => {
          (useIlmExplain as jest.Mock).mockReturnValue({
            error: null,
            ilmExplain: auditbeatWithAllResults.ilmExplain,
            loading: false,
          });

          (useStats as jest.Mock).mockReturnValue({
            stats: auditbeatWithAllResults.stats,
            error: null,
            loading: false,
          });

          const onDismissTour = jest.fn();

          render(
            <TestExternalProviders>
              <TestDataQualityProviders>
                <Pattern
                  patternRollup={auditbeatWithAllResults}
                  chartSelectedIndex={null}
                  setChartSelectedIndex={jest.fn()}
                  indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                  pattern={pattern}
                  isTourActive={true}
                  onDismissTour={onDismissTour}
                  isFirstOpenNonEmptyPattern={true}
                  onAccordionToggle={jest.fn()}
                />
              </TestDataQualityProviders>
            </TestExternalProviders>
          );

          const tourDialog = await screen.findByRole('dialog', {
            name: 'Introducing data quality history',
          });

          const closeButton = within(tourDialog).getByRole('button', { name: 'Close' });

          await userEvent.click(closeButton);

          expect(onDismissTour).toHaveBeenCalledTimes(1);
        });
      });

      describe('when the tour tryIt action is clicked', () => {
        it('opens the flyout with history tab and invokes onDismissTour', async () => {
          (useIlmExplain as jest.Mock).mockReturnValue({
            error: null,
            ilmExplain: auditbeatWithAllResults.ilmExplain,
            loading: false,
          });

          (useStats as jest.Mock).mockReturnValue({
            stats: auditbeatWithAllResults.stats,
            error: null,
            loading: false,
          });

          const onDismissTour = jest.fn();

          render(
            <TestExternalProviders>
              <TestDataQualityProviders>
                <Pattern
                  patternRollup={auditbeatWithAllResults}
                  chartSelectedIndex={null}
                  setChartSelectedIndex={jest.fn()}
                  indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                  pattern={pattern}
                  isTourActive={true}
                  onDismissTour={onDismissTour}
                  isFirstOpenNonEmptyPattern={true}
                  onAccordionToggle={jest.fn()}
                />
              </TestDataQualityProviders>
            </TestExternalProviders>
          );

          const tourDialog = await screen.findByRole('dialog', {
            name: 'Introducing data quality history',
          });

          const tryItButton = within(tourDialog).getByRole('button', { name: 'Try it' });

          await userEvent.click(tryItButton);

          expect(onDismissTour).toHaveBeenCalledTimes(1);
          expect(screen.getByTestId('indexCheckFlyout')).toBeInTheDocument();
          expect(screen.getByRole('tab', { name: 'Latest Check' })).toHaveAttribute(
            'aria-selected',
            'false'
          );
          expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute(
            'aria-selected',
            'true'
          );
        });
      });

      describe('when latest latest check flyout tab is opened', () => {
        it('hides the tour in listview and shows in flyout', async () => {
          (useIlmExplain as jest.Mock).mockReturnValue({
            error: null,
            ilmExplain: auditbeatWithAllResults.ilmExplain,
            loading: false,
          });

          (useStats as jest.Mock).mockReturnValue({
            stats: auditbeatWithAllResults.stats,
            error: null,
            loading: false,
          });

          const onDismissTour = jest.fn();

          render(
            <TestExternalProviders>
              <TestDataQualityProviders>
                <Pattern
                  patternRollup={auditbeatWithAllResults}
                  chartSelectedIndex={null}
                  setChartSelectedIndex={jest.fn()}
                  indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                  pattern={pattern}
                  isTourActive={true}
                  onDismissTour={onDismissTour}
                  isFirstOpenNonEmptyPattern={true}
                  onAccordionToggle={jest.fn()}
                />
              </TestDataQualityProviders>
            </TestExternalProviders>
          );

          const rows = screen.getAllByRole('row');
          // skipping the first row which is the header
          const firstBodyRow = within(rows[1]);

          expect(await firstBodyRow.findByTestId('historicalResultsTour')).toBeInTheDocument();
          expect(
            screen.getByRole('dialog', { name: 'Introducing data quality history' })
          ).toBeInTheDocument();

          const checkNowButton = firstBodyRow.getByRole('button', {
            name: 'Check now',
          });
          await userEvent.click(checkNowButton);

          expect(screen.getByTestId('indexCheckFlyout')).toBeInTheDocument();
          expect(screen.getByRole('tab', { name: 'Latest Check' })).toHaveAttribute(
            'aria-selected',
            'true'
          );
          expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute(
            'aria-selected',
            'false'
          );

          expect(firstBodyRow.queryByTestId('historicalResultsTour')).not.toBeInTheDocument();

          const tabWrapper = await screen.findByRole('tab', { name: 'History' });
          await waitFor(() =>
            expect(
              tabWrapper.closest('[data-test-subj="historicalResultsTour"]')
            ).toBeInTheDocument()
          );

          expect(onDismissTour).not.toHaveBeenCalled();
        }, 10000);
      });
    });

    describe('when not isFirstOpenNonEmptyPattern', () => {
      it('does not render the tour', async () => {
        (useIlmExplain as jest.Mock).mockReturnValue({
          error: null,
          ilmExplain: auditbeatWithAllResults.ilmExplain,
          loading: false,
        });

        (useStats as jest.Mock).mockReturnValue({
          stats: auditbeatWithAllResults.stats,
          error: null,
          loading: false,
        });

        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={true}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={false}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        expect(screen.queryByTestId('historicalResultsTour')).not.toBeInTheDocument();
      });
    });

    describe('when not isTourActive', () => {
      it('does not render the tour', async () => {
        (useIlmExplain as jest.Mock).mockReturnValue({
          error: null,
          ilmExplain: auditbeatWithAllResults.ilmExplain,
          loading: false,
        });

        (useStats as jest.Mock).mockReturnValue({
          stats: auditbeatWithAllResults.stats,
          error: null,
          loading: false,
        });

        render(
          <TestExternalProviders>
            <TestDataQualityProviders>
              <Pattern
                patternRollup={auditbeatWithAllResults}
                chartSelectedIndex={null}
                setChartSelectedIndex={jest.fn()}
                indexNames={Object.keys(auditbeatWithAllResults.stats!)}
                pattern={pattern}
                isTourActive={false}
                onDismissTour={jest.fn()}
                isFirstOpenNonEmptyPattern={true}
                onAccordionToggle={jest.fn()}
              />
            </TestDataQualityProviders>
          </TestExternalProviders>
        );

        expect(screen.queryByTestId('historicalResultsTour')).not.toBeInTheDocument();
      });
    });
  });
});
