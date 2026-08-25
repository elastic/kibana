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
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import { PreviewResultsStep } from './preview_results_step';

const values = {
  ...emptyDatasetWizardFormValues(),
  name: 'dataset-obs',
  data_source: 'obs-prod-s3',
  resource: 's3://obs-logs-prod/**/*.parquet',
  settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
};

describe('PreviewResultsStep', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not fetch results until the preview button is clicked', () => {
    render(
      <EuiProvider>
        <PreviewResultsStep values={values} />
      </EuiProvider>
    );

    expect(screen.getByText('Preview results (optional)')).toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardPreviewResultsButton')).toBeInTheDocument();
    expect(screen.queryByTestId('datasetWizardPreviewResultsRefreshButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('datasetWizardTestConfigurationTable')).not.toBeInTheDocument();
  });

  it('shows mock rows after the preview button is clicked', async () => {
    jest.useFakeTimers();

    render(
      <EuiProvider>
        <PreviewResultsStep values={values} />
      </EuiProvider>
    );

    fireEvent.click(screen.getByTestId('datasetWizardPreviewResultsButton'));
    expect(screen.getByTestId('datasetWizardTestConfigurationLoading')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('datasetWizardTestConfigurationLoading')).not.toBeInTheDocument();
      expect(screen.getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
    });

    expect(screen.getByTestId('datasetWizardPreviewResultsRefreshButton')).toBeInTheDocument();
  });

  it('keeps the last preview and lets the user refresh it after configuration changes', async () => {
    jest.useFakeTimers();

    const { rerender } = render(
      <EuiProvider>
        <PreviewResultsStep values={values} />
      </EuiProvider>
    );

    fireEvent.click(screen.getByTestId('datasetWizardPreviewResultsButton'));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(screen.getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
    });

    expect(screen.getByTestId('datasetWizardPreviewResultsRefreshButton')).toBeInTheDocument();

    rerender(
      <EuiProvider>
        <PreviewResultsStep
          values={{
            ...values,
            resource: 's3://obs-logs-prod/**/*.csv',
            settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
          }}
        />
      </EuiProvider>
    );

    expect(screen.getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
    expect(screen.queryByTestId('datasetWizardPreviewResultsButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardPreviewResultsRefreshButton')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /@timestamp/ })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('datasetWizardPreviewResultsRefreshButton'));
    expect(screen.getByTestId('datasetWizardTestConfigurationLoading')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(screen.getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
    });

    expect(screen.queryByRole('columnheader', { name: /@timestamp/ })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /timestamp/ })).toBeInTheDocument();
  });
});
