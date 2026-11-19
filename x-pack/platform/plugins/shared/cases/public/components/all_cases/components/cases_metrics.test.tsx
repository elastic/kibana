/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { renderWithTestingProviders } from '../../../common/mock';
import type { KpiMetricResult } from '../../../../common/types/api';
import type {
  CustomKpiMetricConfiguration,
  KpiMetricConfiguration,
  KpiMetricThreshold,
} from '../../../../common/types/domain';
import { CasesMetrics } from './cases_metrics';
import { getKpiChangeColor, getKpiChangePercent, getKpiThresholdColor } from './kpi_metric_tile';

jest.mock('pretty-ms', () => jest.fn().mockReturnValue('2ms'));

const CLOSE_DATE_TEXT =
  'Filtered by the case close date. Open cases are not counted. The case table uses the created date.';

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

    it('reads the predefined alert tiles from the metric results', async () => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[
            {
              id: 'tta',
              kind: 'predefined',
              predefinedId: 'alert_time_to_acknowledge_median',
              display: 'value',
            },
          ]}
          kpiResults={[
            { id: 'tta', type: 'value', format: 'duration', value: 101, previousValue: 101 },
          ]}
          isAnalyticsEnabled={true}
        />
      );

      const tile = await screen.findByTestId('cases-kpi-tile-tta');

      expect(within(tile).getByText('Median time to acknowledge an alert')).toBeInTheDocument();
      expect(within(tile).getByText('2ms')).toBeInTheDocument();
      expect(screen.getByTestId('cases-kpi-tile-tta-change')).toBeInTheDocument();
    });

    it('shows an empty predefined alert tile when analytics is disabled', async () => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[
            {
              id: 'tta',
              kind: 'predefined',
              predefinedId: 'alert_time_to_acknowledge_avg',
              display: 'value',
            },
          ]}
          isAnalyticsEnabled={false}
        />
      );

      expect(
        within(await screen.findByTestId('cases-kpi-tile-tta')).getByText('-')
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

    it('shows the acknowledge rule in the info icon of an alert tile', async () => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[
            {
              id: 'tta',
              kind: 'predefined',
              predefinedId: 'alert_time_to_acknowledge_avg',
              display: 'value',
            },
          ]}
          kpiResults={[{ id: 'tta', type: 'value', format: 'duration', value: 101 }]}
          isAnalyticsEnabled={true}
        />
      );

      await userEvent.hover(await screen.findByTestId('cases-kpi-tile-tta-date-hint'));

      expect(
        await screen.findByText(/Time from the alert start to the first assignment or In progress/)
      ).toBeInTheDocument();
    });

    it.each([
      ['assigned' as const, /first assignment after the alert was added/],
      ['in_progress' as const, /first In progress status after the alert was added/],
      ['assigned_or_in_progress' as const, /first assignment or In progress status/],
    ])('shows the text of the trigger %s in the info icon', async (acknowledgeTrigger, text) => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[
            {
              id: 'tta',
              kind: 'predefined',
              predefinedId: 'alert_time_to_acknowledge_avg',
              display: 'value',
              acknowledgeTrigger,
            },
          ]}
          kpiResults={[{ id: 'tta', type: 'value', format: 'duration', value: 101 }]}
          isAnalyticsEnabled={true}
        />
      );

      await userEvent.hover(await screen.findByTestId('cases-kpi-tile-tta-date-hint'));

      expect(await screen.findByText(text)).toBeInTheDocument();
    });

    it('shows the same close date sentence on a custom tile and on an alert tile', async () => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[
            {
              id: 'c1',
              kind: 'custom',
              label: 'Time to resolve',
              index: 'cases',
              query: '',
              display: 'value',
              dateField: 'closed_at',
            },
            {
              id: 'tta',
              kind: 'predefined',
              predefinedId: 'alert_time_to_acknowledge_avg',
              display: 'value',
              dateBasis: 'case_closed_at',
            },
          ]}
          kpiResults={[
            { id: 'c1', type: 'value', format: 'duration', value: 101 },
            { id: 'tta', type: 'value', format: 'duration', value: 101 },
          ]}
          isAnalyticsEnabled={true}
        />
      );

      await userEvent.hover(await screen.findByTestId('cases-kpi-tile-c1-date-hint'));
      expect(await screen.findByText(CLOSE_DATE_TEXT)).toBeInTheDocument();
      await userEvent.unhover(screen.getByTestId('cases-kpi-tile-c1-date-hint'));

      await userEvent.hover(screen.getByTestId('cases-kpi-tile-tta-date-hint'));
      expect(
        await screen.findByText(
          (content) =>
            content.includes('first assignment or In progress') && content.endsWith(CLOSE_DATE_TEXT)
        )
      ).toBeInTheDocument();
    });

    it('adds the sentence that each case counts once to the info icon', async () => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[
            {
              id: 'tta',
              kind: 'predefined',
              predefinedId: 'alert_time_to_acknowledge_avg',
              display: 'value',
              aggregateBy: 'case',
            },
          ]}
          kpiResults={[{ id: 'tta', type: 'value', format: 'duration', value: 101 }]}
          isAnalyticsEnabled={true}
        />
      );

      await userEvent.hover(await screen.findByTestId('cases-kpi-tile-tta-date-hint'));

      expect(await screen.findByText(/Each case counts once\./)).toBeInTheDocument();
    });

    it('adds the sentence that the case query scopes the tile to the info icon', async () => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[
            {
              id: 'tta',
              kind: 'predefined',
              predefinedId: 'alert_time_to_acknowledge_avg',
              display: 'value',
              caseQuery: 'case.category: "Network"',
            },
          ]}
          kpiResults={[{ id: 'tta', type: 'value', format: 'duration', value: 101 }]}
          isAnalyticsEnabled={true}
        />
      );

      await userEvent.hover(await screen.findByTestId('cases-kpi-tile-tta-date-hint'));

      expect(
        await screen.findByText(/Only cases that match the case query are counted\./)
      ).toBeInTheDocument();
    });

    it('shows the date hint for a custom tile with the closed date', async () => {
      const closedDateMetric: CustomKpiMetricConfiguration = {
        id: 'c1',
        kind: 'custom',
        label: 'Closed by elastic',
        index: 'cases',
        query: 'case.closed_by.username: elastic',
        display: 'value',
        dateField: 'closed_at',
      };

      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[closedDateMetric]}
          kpiResults={[{ id: 'c1', type: 'value', format: 'number', value: 9 }]}
          isAnalyticsEnabled={true}
        />
      );

      await userEvent.hover(await screen.findByTestId('cases-kpi-tile-c1-date-hint'));

      expect(await screen.findByText(CLOSE_DATE_TEXT)).toBeInTheDocument();
    });

    it('shows no date hint for a tile with the default date', async () => {
      renderWithTestingProviders(
        <CasesMetrics
          {...props}
          kpiMetrics={[
            customMetric('c1'),
            { id: 'p1', kind: 'predefined', predefinedId: 'closed_cases', display: 'value' },
          ]}
          kpiResults={[{ id: 'c1', type: 'value', format: 'number', value: 7 }]}
          isAnalyticsEnabled={true}
        />
      );

      expect(await screen.findByTestId('cases-kpi-tile-c1')).toBeInTheDocument();
      expect(screen.queryByTestId('cases-kpi-tile-c1-date-hint')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cases-kpi-tile-p1-date-hint')).not.toBeInTheDocument();
    });

    describe('duration unit', () => {
      const durationMetric = (
        id: string,
        threshold: KpiMetricThreshold
      ): CustomKpiMetricConfiguration => ({
        id,
        kind: 'custom',
        label: `Metric ${id}`,
        index: 'cases',
        query: '',
        display: 'value',
        aggregation: { type: 'median', field: 'case.time_to_resolve' },
        threshold,
      });

      it('shows the value in the threshold unit with the threshold color', async () => {
        renderWithTestingProviders(
          <CasesMetrics
            {...props}
            kpiMetrics={[durationMetric('d1', { comparator: 'above', value: 86400, unit: 'h' })]}
            kpiResults={[{ id: 'd1', type: 'value', format: 'duration', value: 137752 }]}
            isAnalyticsEnabled={true}
          />
        );

        const title = within(await screen.findByTestId('cases-kpi-tile-d1')).getByText('38.3 h');

        expect(title.className).toMatch(/danger/);
      });

      it('shows the same change in percent with and without a unit', async () => {
        renderWithTestingProviders(
          <CasesMetrics
            {...props}
            kpiMetrics={[
              {
                ...durationMetric('unit', { comparator: 'above', value: 86400, unit: 'h' }),
                direction: 'lower_is_better',
              },
              {
                ...durationMetric('noUnit', { comparator: 'above', value: 86400 }),
                direction: 'lower_is_better',
              },
            ]}
            kpiResults={[
              {
                id: 'unit',
                type: 'value',
                format: 'duration',
                value: 137752,
                previousValue: 86400,
              },
              {
                id: 'noUnit',
                type: 'value',
                format: 'duration',
                value: 137752,
                previousValue: 86400,
              },
            ]}
            isAnalyticsEnabled={true}
          />
        );

        expect(await screen.findByTestId('cases-kpi-tile-unit-change')).toHaveTextContent(
          '+59% vs. previous period'
        );
        expect(screen.getByTestId('cases-kpi-tile-noUnit-change')).toHaveTextContent(
          '+59% vs. previous period'
        );
      });
    });

    describe('breakdown', () => {
      const breakdownMetric: CustomKpiMetricConfiguration = {
        id: 'severity',
        kind: 'custom',
        label: 'Cases by severity',
        index: 'cases',
        query: '',
        display: 'value',
        groupBy: { field: 'case.severity' },
      };

      it('shows the breakdown tile for a custom metric with a group-by field', async () => {
        renderWithTestingProviders(
          <CasesMetrics
            {...props}
            kpiMetrics={[breakdownMetric]}
            kpiResults={[
              {
                id: 'severity',
                type: 'breakdown',
                field: 'case.severity',
                total: 22,
                buckets: [
                  { key: 'critical', count: 12 },
                  { key: 'high', count: 10 },
                ],
                otherCount: 0,
                missingCount: 0,
              },
            ]}
            isAnalyticsEnabled={true}
          />
        );

        const tile = await screen.findByTestId('cases-kpi-tile-severity');
        expect(within(tile).getByText('22')).toBeInTheDocument();
        expect(within(tile).getByText('Critical')).toBeInTheDocument();
        expect(within(tile).getByText('High')).toBeInTheDocument();
      });

      it('shows the error tile for a failed breakdown metric', async () => {
        renderWithTestingProviders(
          <CasesMetrics
            {...props}
            kpiMetrics={[breakdownMetric]}
            kpiResults={[{ id: 'severity', type: 'error', message: 'bad field' }]}
            isAnalyticsEnabled={true}
          />
        );

        const tile = await screen.findByTestId('cases-kpi-tile-severity');
        expect(within(tile).getByText('-')).toBeInTheDocument();
        expect(within(tile).queryByText('Critical')).not.toBeInTheDocument();
      });
    });

    it('shows an empty custom tile when analytics is disabled', async () => {
      renderWithTestingProviders(
        <CasesMetrics {...props} kpiMetrics={[customMetric('c1')]} isAnalyticsEnabled={false} />
      );

      expect(
        within(await screen.findByTestId('cases-kpi-tile-c1')).getByText('-')
      ).toBeInTheDocument();
    });

    describe('previous period', () => {
      it('shows the change from the previous period', async () => {
        renderWithTestingProviders(
          <CasesMetrics
            {...props}
            kpiMetrics={[{ ...customMetric('c1'), direction: 'lower_is_better' }]}
            kpiResults={[
              { id: 'c1', type: 'value', format: 'number', value: 12, previousValue: 10 },
            ]}
            isAnalyticsEnabled={true}
          />
        );

        expect(await screen.findByTestId('cases-kpi-tile-c1-change')).toHaveTextContent(
          '+20% vs. previous period'
        );
      });

      it('does not show a change when the previous value is zero or missing', async () => {
        renderWithTestingProviders(
          <CasesMetrics
            {...props}
            kpiMetrics={[customMetric('zero'), customMetric('missing')]}
            kpiResults={[
              { id: 'zero', type: 'value', format: 'number', value: 3, previousValue: 0 },
              { id: 'missing', type: 'value', format: 'number', value: 3 },
            ]}
            isAnalyticsEnabled={true}
          />
        );

        expect(await screen.findByTestId('cases-kpi-tile-zero')).toBeInTheDocument();
        expect(screen.queryByTestId('cases-kpi-tile-zero-change')).not.toBeInTheDocument();
        expect(screen.queryByTestId('cases-kpi-tile-missing-change')).not.toBeInTheDocument();
      });

      it('calculates the change in percent', () => {
        expect(getKpiChangePercent(12, 10)).toBe(20);
        expect(getKpiChangePercent(5, 10)).toBe(-50);
        expect(getKpiChangePercent(5, 0)).toBeUndefined();
        expect(getKpiChangePercent(null, 10)).toBeUndefined();
        expect(getKpiChangePercent(5, null)).toBeUndefined();
      });

      it('colors the change with the direction of the metric', () => {
        expect(getKpiChangeColor(20, 'higher_is_better')).toBe('success');
        expect(getKpiChangeColor(-20, 'higher_is_better')).toBe('danger');
        expect(getKpiChangeColor(20, 'lower_is_better')).toBe('danger');
        expect(getKpiChangeColor(-20, 'lower_is_better')).toBe('success');
        expect(getKpiChangeColor(0, 'lower_is_better')).toBe('subdued');
        expect(getKpiChangeColor(20)).toBe('subdued');
      });
    });
  });
});
