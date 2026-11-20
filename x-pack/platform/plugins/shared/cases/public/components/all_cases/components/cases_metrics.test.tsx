/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within } from '@testing-library/react';
import React from 'react';

import { renderWithTestingProviders } from '../../../common/mock';
import type { KpiMetricResult } from '../../../../common/types/api';
import type { KpiMetricConfiguration, KpiMetricThreshold } from '../../../../common/types/domain';
import { CasesMetrics } from './cases_metrics';
import { getKpiThresholdColor } from './kpi_metric_tile';

jest.mock('pretty-ms', () => jest.fn().mockReturnValue('2ms'));

describe('Cases metrics', () => {
  const props = {
    countOpenCases: 20,
    countInProgressCases: 40,
    countClosedCases: 130,
    mttr: 2000,
    isLoading: false,
  };

  it('renders the correct stats', async () => {
    renderWithTestingProviders(<CasesMetrics {...props} />);

    expect(await screen.findByTestId('cases-metrics-stats')).toBeInTheDocument();

    expect(
      within(await screen.findByTestId('openStatsHeader')).getByText('20')
    ).toBeInTheDocument();

    expect(
      within(await screen.findByTestId('inProgressStatsHeader')).getByText('40')
    ).toBeInTheDocument();

    expect(
      within(await screen.findByTestId('closedStatsHeader')).getByText('130')
    ).toBeInTheDocument();

    expect(
      within(await screen.findByTestId('mttrStatsHeader')).getByText('2ms')
    ).toBeInTheDocument();
  });

  it('renders a dash when mttr is null', async () => {
    renderWithTestingProviders(<CasesMetrics {...props} mttr={null} />);

    expect(within(await screen.findByTestId('mttrStatsHeader')).getByText('-')).toBeInTheDocument();
  });

  it('should render the loading spinner when loading stats', async () => {
    renderWithTestingProviders(<CasesMetrics {...props} isLoading={true} />);

    expect(screen.getByTestId('openStatsHeader-loading-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('inProgressStatsHeader-loading-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('closedStatsHeader-loading-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('mttr-stat-loading-spinner')).toBeInTheDocument();
  });

  describe('KPI tiles', () => {
    const customMetric = (id: string, threshold?: KpiMetricThreshold): KpiMetricConfiguration => ({
      id,
      kind: 'custom',
      label: `Metric ${id}`,
      index: 'cases',
      query: '',
      display: 'value',
      threshold,
    });

    it('renders the four default stats when no list is saved', async () => {
      renderWithTestingProviders(<CasesMetrics {...props} />);

      expect(await screen.findByTestId('cases-metrics-stats')).toBeInTheDocument();
      expect(screen.queryByTestId('cases-kpi-tiles')).not.toBeInTheDocument();
    });

    it('renders nothing when the saved list is empty', () => {
      renderWithTestingProviders(<CasesMetrics {...props} kpiMetrics={[]} />);

      expect(screen.queryByTestId('cases-metrics-stats')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cases-kpi-tiles')).not.toBeInTheDocument();
    });

    it('renders 8 tiles from the saved list', async () => {
      const kpiMetrics = Array.from({ length: 8 }, (_, index) => customMetric(`m${index}`));
      const kpiResults: KpiMetricResult[] = kpiMetrics.map(({ id }, index) => ({
        id,
        type: 'value',
        format: 'number',
        value: index,
      }));

      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={kpiMetrics}
          kpiResults={kpiResults}
          isAnalyticsEnabled={true}
        />
      );

      expect(await screen.findByTestId('cases-kpi-tiles')).toBeInTheDocument();
      expect(screen.getAllByTestId(/^cases-kpi-tile-m\d$/)).toHaveLength(8);
      expect(within(screen.getByTestId('cases-kpi-tile-m7')).getByText('7')).toBeInTheDocument();
    });

    it('reads the predefined tiles from the case search stats', async () => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[
            { id: 'p1', kind: 'predefined', predefinedId: 'closed_cases', display: 'value' },
          ]}
        />
      );

      expect(
        within(await screen.findByTestId('cases-kpi-tile-p1')).getByText('130')
      ).toBeInTheDocument();
    });

    it('shows the danger color for a breached threshold and the success color otherwise', async () => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[
            customMetric('breached', { comparator: 'above', value: 10 }),
            customMetric('within', { comparator: 'above', value: 10 }),
          ]}
          kpiResults={[
            { id: 'breached', type: 'value', format: 'number', value: 11 },
            { id: 'within', type: 'value', format: 'number', value: 9 },
          ]}
          isAnalyticsEnabled={true}
        />
      );

      expect(getKpiThresholdColor(11, { comparator: 'above', value: 10 })).toBe('danger');
      expect(getKpiThresholdColor(9, { comparator: 'above', value: 10 })).toBe('success');
      expect(getKpiThresholdColor(9, { comparator: 'below', value: 10 })).toBe('danger');
      expect(await screen.findByTestId('cases-kpi-tile-breached')).toBeInTheDocument();
    });

    it('shows an empty tile for a failed metric and keeps the other tiles', async () => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[customMetric('failed'), customMetric('valid')]}
          kpiResults={[
            { id: 'failed', type: 'error', message: 'bad query' },
            { id: 'valid', type: 'value', format: 'number', value: 5 },
          ]}
          isAnalyticsEnabled={true}
        />
      );

      expect(
        within(await screen.findByTestId('cases-kpi-tile-failed')).getByText('-')
      ).toBeInTheDocument();
      expect(within(screen.getByTestId('cases-kpi-tile-valid')).getByText('5')).toBeInTheDocument();
    });

    it('shows the loading spinner instead of the previous value while the results refetch', async () => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[customMetric('c1', { comparator: 'above', value: 10 })]}
          kpiResults={[{ id: 'c1', type: 'value', format: 'number', value: 11 }]}
          isLoadingKpiResults={true}
          isAnalyticsEnabled={true}
        />
      );

      expect(await screen.findByTestId('cases-kpi-tile-c1-loading-spinner')).toBeInTheDocument();
      expect(within(screen.getByTestId('cases-kpi-tile-c1')).queryByText('11')).toBeNull();
    });

    it('shows an empty custom tile when analytics is disabled', async () => {
      renderWithTestingProviders(
        <CasesMetrics {...props} kpiMetrics={[customMetric('c1')]} isAnalyticsEnabled={false} />
      );

      expect(
        within(await screen.findByTestId('cases-kpi-tile-c1')).getByText('-')
      ).toBeInTheDocument();
    });
  });
});
