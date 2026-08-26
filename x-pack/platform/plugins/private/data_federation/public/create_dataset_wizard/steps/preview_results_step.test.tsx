/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { applySettingsForFormat } from '../../create_dataset_flyout/dataset_settings_defaults';
import { emptyCreateDatasetSettingsFormValues } from '../../create_dataset_flyout/create_dataset_flyout_form_state';
import {
  emptyDatasetWizardFormValues,
  type DatasetWizardFormValues,
} from '../dataset_wizard_form_state';
import { PreviewResultsStep } from './preview_results_step';

const values = {
  ...emptyDatasetWizardFormValues(),
  name: 'dataset-obs',
  data_source: 'obs-prod-s3',
  resource: 's3://obs-logs-prod/**/*.parquet',
  settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
};

const csvValues: DatasetWizardFormValues = {
  ...values,
  resource: 's3://obs-logs-prod/**/*.csv',
  settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
};

const renderStep = (props: { values?: DatasetWizardFormValues; isActive?: boolean } = {}) =>
  render(
    <EuiProvider>
      <PreviewResultsStep values={props.values ?? values} isActive={props.isActive ?? true} />
    </EuiProvider>
  );

const rerenderStep = (
  rerender: (ui: React.ReactElement) => void,
  props: { values?: DatasetWizardFormValues; isActive?: boolean } = {}
) =>
  rerender(
    <EuiProvider>
      <PreviewResultsStep values={props.values ?? values} isActive={props.isActive ?? true} />
    </EuiProvider>
  );

const generatePreview = async () => {
  fireEvent.click(screen.getByTestId('datasetWizardPreviewResultsButton'));
  expect(screen.getByTestId('datasetWizardTestConfigurationLoading')).toBeInTheDocument();

  await act(async () => {
    jest.advanceTimersByTime(600);
  });

  await waitFor(() => {
    expect(screen.queryByTestId('datasetWizardTestConfigurationLoading')).not.toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
  });
};

describe('PreviewResultsStep', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not fetch results until the preview button is clicked', () => {
    renderStep();

    expect(screen.getByText('Preview results (optional)')).toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardPreviewResultsButton')).toBeInTheDocument();
    expect(
      screen.queryByTestId('datasetWizardPreviewResultsRefreshButton')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('datasetWizardTestConfigurationTable')).not.toBeInTheDocument();
  });

  it('shows mock rows after the preview button is clicked', async () => {
    jest.useFakeTimers();

    renderStep();
    await generatePreview();

    expect(
      screen.queryByTestId('datasetWizardPreviewResultsRefreshButton')
    ).not.toBeInTheDocument();
  });

  it('keeps the last preview when returning without configuration changes', async () => {
    jest.useFakeTimers();

    const { rerender } = renderStep();
    await generatePreview();

    rerenderStep(rerender, { isActive: false });
    expect(screen.getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
    expect(screen.queryByTestId('datasetWizardTestConfigurationLoading')).not.toBeInTheDocument();

    rerenderStep(rerender, { isActive: true });
    expect(screen.getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
    expect(screen.queryByTestId('datasetWizardTestConfigurationLoading')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /@timestamp/ })).toBeInTheDocument();
  });

  it('refreshes the last preview when returning after configuration changes', async () => {
    jest.useFakeTimers();

    const { rerender } = renderStep();
    await generatePreview();

    expect(screen.getByRole('columnheader', { name: /@timestamp/ })).toBeInTheDocument();

    rerenderStep(rerender, { isActive: false });
    rerenderStep(rerender, { values: csvValues, isActive: false });
    rerenderStep(rerender, { values: csvValues, isActive: true });

    expect(screen.getByTestId('datasetWizardTestConfigurationLoading')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(screen.getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
    });

    expect(screen.queryByRole('columnheader', { name: /@timestamp/ })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /timestamp/ })).toBeInTheDocument();
    expect(
      screen.queryByTestId('datasetWizardPreviewResultsRefreshButton')
    ).not.toBeInTheDocument();
  });

  it('does not refresh while the step stays active even if configuration changes', async () => {
    jest.useFakeTimers();

    const { rerender } = renderStep();
    await generatePreview();

    rerenderStep(rerender, { values: csvValues, isActive: true });

    expect(screen.getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
    expect(screen.queryByTestId('datasetWizardTestConfigurationLoading')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /@timestamp/ })).toBeInTheDocument();
  });
});
