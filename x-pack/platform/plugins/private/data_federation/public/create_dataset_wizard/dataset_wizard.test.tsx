/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';

import type { DataSource } from '../../common';
import { DatasetWizard } from './dataset_wizard';
import { emptyDatasetWizardFormValues } from './dataset_wizard_form_state';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      dataSourcesClient: {
        add: jest.fn(),
      },
    },
  }),
}));

describe('DatasetWizard step navigation', () => {
  const dataSources: DataSource[] = [
    { name: 'source-1', type: 's3', description: '', settings: {} },
  ];

  it('shows additional settings step after completing logistics', async () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <EuiProvider>
        <DatasetWizard
          isEditMode={false}
          existingDataSetNames={[]}
          dataSources={dataSources}
          defaultValues={emptyDatasetWizardFormValues()}
          reloadDataSources={jest.fn().mockResolvedValue(undefined)}
          onCancel={jest.fn()}
          onSave={jest.fn().mockResolvedValue(null)}
        />
      </EuiProvider>
    );

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
    });
  });
});
