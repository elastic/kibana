/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

import type { DataSource } from '../../common';
import { ADDITIONAL_SETTINGS_STEP } from './dataset_wizard_constants';
import { DatasetWizard } from './dataset_wizard';
import { emptyDatasetWizardFormValues } from './dataset_wizard_form_state';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      dataSourcesClient: {
        add: jest.fn(),
      },
      indexManagement: {
        getMappedFieldsEditorComponent: () => () => null,
      },
      scopedHistory: {
        createSubHistory: jest.fn(),
      },
    },
  }),
}));

describe('DatasetWizard step navigation', () => {
  const dataSources: DataSource[] = [
    { name: 'source-1', type: 's3', description: '', settings: {} },
  ];

  beforeEach(() => {
    sessionStorage.clear();
  });

  const renderWizard = (initialEntry = '/create', defaultValues = emptyDatasetWizardFormValues()) => {
    const history = createMemoryHistory({ initialEntries: [initialEntry] });

    const view = render(
      <Router history={history}>
        <EuiProvider>
          <DatasetWizard
            isEditMode={false}
            existingDataSetNames={[]}
            dataSources={dataSources}
            defaultValues={defaultValues}
            reloadDataSources={jest.fn().mockResolvedValue(undefined)}
            onCancel={jest.fn()}
            onSave={jest.fn().mockResolvedValue(null)}
          />
        </EuiProvider>
      </Router>
    );

    return { ...view, history };
  };

  it('shows additional settings step after completing logistics', async () => {
    const { getByRole, getByTestId, queryByTestId, history } = renderWizard();

    expect(queryByTestId('datasetWizardSettingsFormat')).toBeNull();

    fireEvent.click(getByTestId('datasetWizardDataSource'));
    fireEvent.click(getByRole('option', { name: 'source-1' }));
    fireEvent.change(getByTestId('datasetWizardName'), {
      target: { value: 'my-dataset' },
    });
    fireEvent.change(getByTestId('datasetWizardResource'), {
      target: { value: 's3://bucket/data.csv' },
    });

    expect(getByTestId('datasetWizardNext')).toBeInTheDocument();
    fireEvent.click(getByTestId('datasetWizardNext'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardAdditionalSettingsStep')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsFormat')).toBeInTheDocument();
      expect(history.location.search).toBe(`?step=${ADDITIONAL_SETTINGS_STEP}`);
    });
  });

  it('restores the wizard step from the URL on load', () => {
    const { getByTestId, container } = renderWizard(`/create?step=${ADDITIONAL_SETTINGS_STEP}`);

    expect(getByTestId('datasetWizardAdditionalSettingsStep')).toBeInTheDocument();

    const currentStepIndicator = container.querySelector('[data-step-status="current"]');
    expect(currentStepIndicator).toHaveTextContent('Additional settings');
  });

  it('restores persisted form values on load', () => {
    const draft = {
      ...emptyDatasetWizardFormValues(),
      data_source: 'source-1',
      name: 'my-dataset',
      resource: 's3://bucket/data.csv',
    };

    const { getByTestId } = renderWizard('/create', draft);

    expect(getByTestId('datasetWizardName')).toHaveValue('my-dataset');
    expect(getByTestId('datasetWizardResource')).toHaveValue('s3://bucket/data.csv');
  });
});
