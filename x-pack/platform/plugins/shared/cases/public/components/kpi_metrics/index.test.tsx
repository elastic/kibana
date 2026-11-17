/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CustomKpiMetricConfiguration } from '../../../common/types/domain';
import { noCasesSettingsPermission, renderWithTestingProviders } from '../../common/mock';
import * as api from '../../containers/api';
import { KpiMetricsSettings } from '.';

jest.mock('../../containers/api');

const customMetric = (id: string): CustomKpiMetricConfiguration => ({
  id,
  kind: 'custom',
  label: `Metric ${id}`,
  index: 'cases',
  query: 'case.status: closed',
  display: 'value',
});

describe('KpiMetricsSettings', () => {
  const onSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the four default metrics when no list is saved', async () => {
    renderWithTestingProviders(<KpiMetricsSettings isLoading={false} onSave={onSave} />);

    expect(await screen.findByTestId('kpi-metrics-default-note')).toBeInTheDocument();
    expect(screen.getByText('Open cases')).toBeInTheDocument();
    expect(screen.getByText('Average time to close')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^kpi-metric-row-/)).toHaveLength(4);
  });

  it('saves the list without the deleted metric', async () => {
    renderWithTestingProviders(
      <KpiMetricsSettings
        kpiMetrics={[customMetric('a'), customMetric('b')]}
        isLoading={false}
        onSave={onSave}
      />
    );

    await userEvent.click(await screen.findByTestId('kpi-metric-delete-0'));

    expect(onSave).toHaveBeenCalledWith([customMetric('b')]);
  });

  it('saves the new order when a metric moves down', async () => {
    renderWithTestingProviders(
      <KpiMetricsSettings
        kpiMetrics={[customMetric('a'), customMetric('b')]}
        isLoading={false}
        onSave={onSave}
      />
    );

    await userEvent.click(await screen.findByTestId('kpi-metric-move-down-0'));

    expect(onSave).toHaveBeenCalledWith([customMetric('b'), customMetric('a')]);
  });

  it('adds a custom metric from the flyout', async () => {
    renderWithTestingProviders(
      <KpiMetricsSettings kpiMetrics={[]} isLoading={false} onSave={onSave} />
    );

    await userEvent.click(await screen.findByTestId('kpi-metric-add'));
    await userEvent.type(await screen.findByTestId('kpi-metric-label'), 'Critical');
    await userEvent.type(screen.getByTestId('kpi-metric-query'), 'case.severity: critical');
    await userEvent.click(screen.getByTestId('kpi-metric-save'));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([
        {
          kind: 'custom',
          label: 'Critical',
          index: 'cases',
          query: 'case.severity: critical',
          display: 'value',
        },
      ])
    );
  });

  it('keeps the fields that the flyout does not edit when it saves an edited metric', async () => {
    const metric: CustomKpiMetricConfiguration = {
      ...customMetric('a'),
      direction: 'lower_is_better',
      percent: true,
      groupBy: { field: 'case.severity' },
    };

    renderWithTestingProviders(
      <KpiMetricsSettings kpiMetrics={[metric]} isLoading={false} onSave={onSave} />
    );

    await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
    await userEvent.click(await screen.findByTestId('kpi-metric-save'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith([metric]));
  });

  it('does not save a custom metric without a label', async () => {
    renderWithTestingProviders(
      <KpiMetricsSettings kpiMetrics={[]} isLoading={false} onSave={onSave} />
    );

    await userEvent.click(await screen.findByTestId('kpi-metric-add'));
    await userEvent.click(await screen.findByTestId('kpi-metric-save'));

    expect(await screen.findByText('A label is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('hides the add button at the maximum of 8 metrics', async () => {
    const kpiMetrics = Array.from({ length: 8 }, (_, index) => customMetric(`m${index}`));

    renderWithTestingProviders(
      <KpiMetricsSettings kpiMetrics={kpiMetrics} isLoading={false} onSave={onSave} />
    );

    expect(await screen.findByTestId('kpi-metrics-max')).toBeInTheDocument();
    expect(screen.queryByTestId('kpi-metric-add')).not.toBeInTheDocument();
  });

  it('is read-only without the settings permission', async () => {
    renderWithTestingProviders(
      <KpiMetricsSettings kpiMetrics={[customMetric('a')]} isLoading={false} onSave={onSave} />,
      { wrapperProps: { permissions: noCasesSettingsPermission() } }
    );

    expect(await screen.findByTestId('kpi-metric-add')).toBeDisabled();
    expect(screen.getByTestId('kpi-metric-delete-0')).toBeDisabled();
    expect(screen.getByTestId('kpi-metric-edit-0')).toBeDisabled();
  });

  it('saves the trend color of an edited metric', async () => {
    renderWithTestingProviders(
      <KpiMetricsSettings kpiMetrics={[customMetric('a')]} isLoading={false} onSave={onSave} />
    );

    await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
    await userEvent.selectOptions(
      await screen.findByTestId('kpi-metric-direction'),
      'lower_is_better'
    );
    await userEvent.click(screen.getByTestId('kpi-metric-save'));

    expect(onSave).toHaveBeenCalledWith([{ ...customMetric('a'), direction: 'lower_is_better' }]);
  });

  it('saves a percent metric', async () => {
    renderWithTestingProviders(
      <KpiMetricsSettings kpiMetrics={[customMetric('a')]} isLoading={false} onSave={onSave} />
    );

    await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
    await userEvent.click(await screen.findByTestId('kpi-metric-percent'));
    await userEvent.click(screen.getByTestId('kpi-metric-save'));

    expect(onSave).toHaveBeenCalledWith([{ ...customMetric('a'), percent: true }]);
  });

  it('describes a saved percent metric', async () => {
    renderWithTestingProviders(
      <KpiMetricsSettings
        kpiMetrics={[{ ...customMetric('a'), percent: true }]}
        isLoading={false}
        onSave={onSave}
      />
    );

    expect(await screen.findByTestId('kpi-metric-row-0')).toHaveTextContent(
      'cases · Percent · case.status: closed'
    );
  });

  describe('Test query', () => {
    it('shows the value of the unsaved metric', async () => {
      const previewSpy = jest.spyOn(api, 'previewKpiMetric').mockResolvedValue({
        id: 'preview',
        type: 'value',
        format: 'number',
        value: 7,
      });

      renderWithTestingProviders(
        <KpiMetricsSettings kpiMetrics={[customMetric('a')]} isLoading={false} onSave={onSave} />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
      await userEvent.click(await screen.findByTestId('kpi-metric-test-query'));

      expect(await screen.findByTestId('kpi-metric-preview-value')).toHaveTextContent(
        'Value for the last 30 days: 7'
      );
      expect(previewSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'now-30d',
          to: 'now',
          metric: expect.objectContaining({ kind: 'custom', query: 'case.status: closed' }),
        })
      );
      expect(onSave).not.toHaveBeenCalled();
    });

    it('shows the error of the unsaved metric', async () => {
      jest.spyOn(api, 'previewKpiMetric').mockResolvedValue({
        id: 'preview',
        type: 'error',
        message: 'The KQL query is not valid',
      });

      renderWithTestingProviders(
        <KpiMetricsSettings kpiMetrics={[customMetric('a')]} isLoading={false} onSave={onSave} />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
      await userEvent.click(await screen.findByTestId('kpi-metric-test-query'));

      expect(await screen.findByTestId('kpi-metric-preview-error')).toHaveTextContent(
        'The KQL query is not valid'
      );
    });
  });
});
