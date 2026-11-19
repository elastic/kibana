/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CustomKpiMetricConfiguration } from '../../../common/types/domain';
import { noCasesSettingsPermission, renderWithTestingProviders } from '../../common/mock';
import * as api from '../../containers/api';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { KpiMetricsSettings } from '.';

jest.mock('../../containers/api');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');

const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;

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
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map() });
  });

  it('shows the four default metrics when no list is saved', async () => {
    renderWithTestingProviders(<KpiMetricsSettings isLoading={false} onSave={onSave} />);

    expect(await screen.findByTestId('kpi-metrics-default-note')).toBeInTheDocument();
    expect(screen.getByText('Open cases')).toBeInTheDocument();
    expect(screen.getByText('Average time to close')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^kpi-metric-row-/)).toHaveLength(4);
    expect(screen.queryByText('Average time to acknowledge an alert')).not.toBeInTheDocument();
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
      groupBy: { field: 'case.severity', size: 5 },
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

  describe('group by', () => {
    it('shows the group-by row for a count and not for an average', async () => {
      renderWithTestingProviders(
        <KpiMetricsSettings kpiMetrics={[]} isLoading={false} onSave={onSave} />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-add'));
      expect(await screen.findByTestId('kpi-metric-group-by')).toBeInTheDocument();

      await userEvent.selectOptions(screen.getByTestId('kpi-metric-aggregation'), 'avg');
      expect(screen.queryByTestId('kpi-metric-group-by')).not.toBeInTheDocument();
    });

    it('saves the group-by field with size 5 and no threshold', async () => {
      const metric: CustomKpiMetricConfiguration = {
        ...customMetric('a'),
        threshold: { comparator: 'above', value: 10 },
      };

      renderWithTestingProviders(
        <KpiMetricsSettings kpiMetrics={[metric]} isLoading={false} onSave={onSave} />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
      await userEvent.type(
        within(await screen.findByTestId('kpi-metric-group-by')).getByTestId('comboBoxSearchInput'),
        'case.severity{enter}'
      );

      expect(await screen.findByTestId('kpi-metric-group-by-size')).toHaveValue(5);
      expect(screen.queryByTestId('kpi-metric-percent')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kpi-metric-threshold-comparator')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('kpi-metric-save'));

      await waitFor(() =>
        expect(onSave).toHaveBeenCalledWith([
          { ...customMetric('a'), groupBy: { field: 'case.severity', size: 5 } },
        ])
      );
    });

    it('describes a saved breakdown metric', async () => {
      renderWithTestingProviders(
        <KpiMetricsSettings
          kpiMetrics={[{ ...customMetric('a'), groupBy: { field: 'case.severity' } }]}
          isLoading={false}
          onSave={onSave}
        />
      );

      expect(await screen.findByTestId('kpi-metric-row-0')).toHaveTextContent(
        'cases · Count by case.severity · case.status: closed'
      );
    });
  });

  describe('date field', () => {
    it('shows the date row only for the cases index and resets it on an index change', async () => {
      renderWithTestingProviders(
        <KpiMetricsSettings
          kpiMetrics={[{ ...customMetric('a'), dateField: 'closed_at' }]}
          isLoading={false}
          onSave={onSave}
        />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
      expect(await screen.findByTestId('kpi-metric-date-field')).toHaveValue('closed_at');

      await userEvent.selectOptions(screen.getByTestId('kpi-metric-index'), 'activity');
      expect(screen.queryByTestId('kpi-metric-date-field')).not.toBeInTheDocument();

      await userEvent.selectOptions(screen.getByTestId('kpi-metric-index'), 'cases');
      expect(screen.getByTestId('kpi-metric-date-field')).toHaveValue('created_at');
    });

    it('saves the closed date', async () => {
      renderWithTestingProviders(
        <KpiMetricsSettings kpiMetrics={[customMetric('a')]} isLoading={false} onSave={onSave} />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
      await userEvent.selectOptions(
        await screen.findByTestId('kpi-metric-date-field'),
        'closed_at'
      );
      await userEvent.click(screen.getByTestId('kpi-metric-save'));

      expect(onSave).toHaveBeenCalledWith([{ ...customMetric('a'), dateField: 'closed_at' }]);
    });
  });

  describe('threshold unit', () => {
    const durationMetric: CustomKpiMetricConfiguration = {
      ...customMetric('a'),
      query: '',
      aggregation: { type: 'median', field: 'case.time_to_resolve' },
    };

    it('shows the unit select for a duration field and hides it for a count', async () => {
      renderWithTestingProviders(
        <KpiMetricsSettings
          kpiMetrics={[durationMetric, customMetric('b')]}
          isLoading={false}
          onSave={onSave}
        />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
      await userEvent.selectOptions(
        await screen.findByTestId('kpi-metric-threshold-comparator'),
        'above'
      );
      expect(screen.getByTestId('kpi-metric-threshold-unit')).toHaveValue('h');

      await userEvent.click(screen.getByTestId('kpi-metric-cancel'));
      await userEvent.click(await screen.findByTestId('kpi-metric-edit-1'));
      await userEvent.selectOptions(
        await screen.findByTestId('kpi-metric-threshold-comparator'),
        'above'
      );
      expect(screen.getByTestId('kpi-metric-threshold-value')).toBeInTheDocument();
      expect(screen.queryByTestId('kpi-metric-threshold-unit')).not.toBeInTheDocument();
    });

    it('saves 3 days in seconds with the unit', async () => {
      renderWithTestingProviders(
        <KpiMetricsSettings kpiMetrics={[durationMetric]} isLoading={false} onSave={onSave} />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
      await userEvent.selectOptions(
        await screen.findByTestId('kpi-metric-threshold-comparator'),
        'above'
      );
      await userEvent.type(screen.getByTestId('kpi-metric-threshold-value'), '3');
      await userEvent.selectOptions(screen.getByTestId('kpi-metric-threshold-unit'), 'd');
      await userEvent.click(screen.getByTestId('kpi-metric-save'));

      expect(onSave).toHaveBeenCalledWith([
        { ...durationMetric, threshold: { comparator: 'above', value: 259200, unit: 'd' } },
      ]);
    });
  });

  describe('Test query', () => {
    it('sends the date field of the unsaved metric', async () => {
      const previewSpy = jest.spyOn(api, 'previewKpiMetric').mockResolvedValue({
        id: 'preview',
        type: 'value',
        format: 'number',
        value: 9,
      });

      renderWithTestingProviders(
        <KpiMetricsSettings kpiMetrics={[customMetric('a')]} isLoading={false} onSave={onSave} />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
      await userEvent.selectOptions(
        await screen.findByTestId('kpi-metric-date-field'),
        'closed_at'
      );
      await userEvent.click(screen.getByTestId('kpi-metric-test-query'));

      await waitFor(() =>
        expect(previewSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            metric: expect.objectContaining({ kind: 'custom', dateField: 'closed_at' }),
          })
        )
      );
    });

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

    it('shows the acknowledge trigger only for an alert metric', async () => {
      const alertMetric = {
        id: 'alert-1',
        kind: 'predefined' as const,
        predefinedId: 'alert_time_to_acknowledge_avg',
        display: 'value' as const,
      };
      renderWithTestingProviders(
        <KpiMetricsSettings kpiMetrics={[alertMetric]} isLoading={false} onSave={onSave} />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
      await userEvent.selectOptions(
        await screen.findByTestId('kpi-metric-acknowledge-trigger'),
        'assigned'
      );
      await userEvent.click(screen.getByTestId('kpi-metric-save'));

      await waitFor(() =>
        expect(onSave).toHaveBeenCalledWith([{ ...alertMetric, acknowledgeTrigger: 'assigned' }])
      );
    });

    it('does not show the acknowledge trigger for a case search metric', async () => {
      renderWithTestingProviders(
        <KpiMetricsSettings
          kpiMetrics={[
            { id: 'open-1', kind: 'predefined', predefinedId: 'open_cases', display: 'value' },
          ]}
          isLoading={false}
          onSave={onSave}
        />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));

      expect(await screen.findByTestId('kpi-metric-predefined-id')).toBeInTheDocument();
      expect(screen.queryByTestId('kpi-metric-acknowledge-trigger')).not.toBeInTheDocument();
    });

    it('shows a duration in the unit of the threshold', async () => {
      jest.spyOn(api, 'previewKpiMetric').mockResolvedValue({
        id: 'preview',
        type: 'value',
        format: 'duration',
        value: 144000,
      });

      renderWithTestingProviders(
        <KpiMetricsSettings
          kpiMetrics={[
            {
              ...customMetric('a'),
              query: '',
              aggregation: { type: 'median', field: 'case.time_to_resolve' },
              threshold: { comparator: 'above', value: 144000, unit: 'h' },
            },
          ]}
          isLoading={false}
          onSave={onSave}
        />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
      await userEvent.click(await screen.findByTestId('kpi-metric-test-query'));

      expect(await screen.findByTestId('kpi-metric-preview-value')).toHaveTextContent('40 h');
    });

    it('shows the assignee names in the breakdown preview', async () => {
      const [profile] = userProfiles;
      useBulkGetUserProfilesMock.mockReturnValue({ data: userProfilesMap });
      jest.spyOn(api, 'previewKpiMetric').mockResolvedValue({
        id: 'preview',
        type: 'breakdown',
        field: 'case.assignees.uid',
        total: 5,
        buckets: [
          { key: profile.uid, count: 3 },
          { key: 'unknown-uid', count: 2 },
        ],
        otherCount: 0,
        missingCount: 0,
      });

      renderWithTestingProviders(
        <KpiMetricsSettings
          kpiMetrics={[
            {
              ...customMetric('a'),
              groupBy: { field: 'case.assignees.uid', size: 5 },
            },
          ]}
          isLoading={false}
          onSave={onSave}
        />
      );

      await userEvent.click(await screen.findByTestId('kpi-metric-edit-0'));
      await userEvent.click(await screen.findByTestId('kpi-metric-test-query'));

      const preview = await screen.findByTestId('kpi-metric-preview-value');
      expect(preview).toHaveTextContent('Damaged Raccoon 3');
      expect(preview).toHaveTextContent('unknown-uid 2');
      expect(useBulkGetUserProfilesMock).toHaveBeenLastCalledWith({
        uids: [profile.uid, 'unknown-uid'],
      });
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
