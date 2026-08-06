/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { applySettingsForFormat } from '../create_dataset_flyout/dataset_settings_defaults';
import { emptyCreateDatasetSettingsFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { emptyDatasetWizardFormValues } from './dataset_wizard_form_state';
import { TestConfigurationPreviewContent } from './test_configuration_preview';
import { TEST_CONFIGURATION_PREVIEW_ROW_COUNT } from './test_configuration_preview_utils';

const defaultValues = {
  ...emptyDatasetWizardFormValues(),
  settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
};

describe('TestConfigurationPreviewContent', () => {
  it('shows a loading spinner while results are loading', () => {
    render(
      <EuiProvider>
        <TestConfigurationPreviewContent values={defaultValues} isLoading />
      </EuiProvider>
    );

    expect(screen.getByTestId('datasetWizardTestConfigurationLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('datasetWizardTestConfigurationTable')).toBeNull();
  });

  it('renders a table with ten mock rows when loading completes', () => {
    render(
      <EuiProvider>
        <TestConfigurationPreviewContent values={defaultValues} />
      </EuiProvider>
    );

    expect(screen.getByTestId('datasetWizardTestConfigurationTableScroll')).toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardTestConfigurationTable')).toBeInTheDocument();
    expect(
      screen.getAllByTestId('datasetWizardTestConfigurationColumn-@timestamp').length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByTestId('datasetWizardTestConfigurationColumn-message').length
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole('row')).toHaveLength(TEST_CONFIGURATION_PREVIEW_ROW_COUNT + 1);
  });
});
