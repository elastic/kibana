/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';

import type { DataSource } from '../../../common';
import { applySettingsForFormat } from '../../create_dataset_flyout/dataset_settings_defaults';
import { emptyCreateDatasetSettingsFormValues } from '../../create_dataset_flyout/create_dataset_flyout_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import { ReviewStep } from './review_step';

const s3DataSource: DataSource = {
  name: 'obs-prod-s3',
  type: 's3',
  description: '',
  settings: {},
};

const defaultValues = {
  ...emptyDatasetWizardFormValues(),
  name: 'dataset-obs-prod-s3',
  data_source: 'obs-prod-s3',
  resource: 's3://obs-logs-prod/**/*.parquet',
  settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
};

describe('ReviewStep', () => {
  it('renders Summary, Preview, and Request tabs', () => {
    render(
      <EuiProvider>
        <ReviewStep values={defaultValues} dataSources={[s3DataSource]} />
      </EuiProvider>
    );

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Request')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Review configuration for dataset-obs-prod-s3' })
    ).toBeInTheDocument();
  });

  it('shows logistics and settings in the summary tab', () => {
    render(
      <EuiProvider>
        <ReviewStep values={defaultValues} dataSources={[s3DataSource]} />
      </EuiProvider>
    );

    expect(screen.getByTestId('datasetWizardReviewLogistics')).toHaveTextContent('obs-prod-s3');
    expect(screen.getByTestId('datasetWizardReviewLogistics')).toHaveTextContent('Amazon S3');
    expect(screen.getByTestId('datasetWizardReviewSettings')).toHaveTextContent('Parquet');
  });

  it('shows the resolved payload in the preview tab', () => {
    render(
      <EuiProvider>
        <ReviewStep values={defaultValues} dataSources={[s3DataSource]} />
      </EuiProvider>
    );

    fireEvent.click(screen.getByText('Preview'));

    expect(screen.getByTestId('datasetWizardReviewPreviewCode')).toHaveTextContent(
      '"name": "dataset-obs-prod-s3"'
    );
    expect(screen.getByTestId('datasetWizardReviewPreviewCode')).toHaveTextContent(
      '"format": "parquet"'
    );
  });

  it('shows the request in the request tab', () => {
    render(
      <EuiProvider>
        <ReviewStep values={defaultValues} dataSources={[s3DataSource]} />
      </EuiProvider>
    );

    fireEvent.click(screen.getByText('Request'));

    expect(screen.getByTestId('datasetWizardReviewRequestCode')).toHaveTextContent(
      'PUT /internal/data_federation/dataset/dataset-obs-prod-s3'
    );
  });
});
