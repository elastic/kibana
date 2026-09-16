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

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import type { DataSource } from '../../common';
import { CREATE_DATASET_PATH, DATASETS_PATH } from '../app_paths';
import { CreateDatasetWizardPage } from './create_dataset_wizard_page';

const docLinksMock = {
  links: {
    dataFederation: {
      overview: '',
      quickstart: '',
      dataSources: '',
      datasets: '',
      datasetSettings: '',
      authentication: '',
      staticCredentials: '',
      federatedIdentity: '',
      querying: '',
      security: '',
    },
  },
};

describe('CreateDatasetWizardPage', () => {
  const dataSources: DataSource[] = [
    { name: 'source-1', type: 's3', description: '', settings: {} },
  ];

  const renderWizard = () => {
    const history = createMemoryHistory({ initialEntries: [CREATE_DATASET_PATH] });
    const add = jest.fn().mockResolvedValue(undefined);
    const loadDataSets = jest.fn().mockResolvedValue(undefined);
    const view = render(
      <EuiProvider>
        <Router history={history}>
          <KibanaContextProvider services={{ docLinks: docLinksMock, datasetsClient: { add } }}>
            <CreateDatasetWizardPage
              dataSources={dataSources}
              existingDataSetNames={[]}
              loadDataSets={loadDataSets}
            />
          </KibanaContextProvider>
        </Router>
      </EuiProvider>
    );
    return { ...view, history, add, loadDataSets };
  };

  it('walks through dataset, advanced, and confirm steps then saves', async () => {
    const { getByTestId, history, add, loadDataSets } = renderWizard();

    expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();

    fireEvent.change(getByTestId('createDatasetFlyoutDataSource'), {
      target: { value: 'source-1' },
    });
    fireEvent.change(getByTestId('createDatasetFlyoutName'), {
      target: { value: 'logs-dataset' },
    });
    fireEvent.change(getByTestId('createDatasetFlyoutResource'), {
      target: { value: 'bucket/*' },
    });

    fireEvent.click(getByTestId('nextButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardAdvancedStep'))).toBeInTheDocument();

    fireEvent.click(getByTestId('backButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardDatasetStep'))).toBeInTheDocument();
    fireEvent.click(getByTestId('nextButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardAdvancedStep'))).toBeInTheDocument();

    fireEvent.click(getByTestId('nextButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    fireEvent.click(getByTestId('backButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardAdvancedStep'))).toBeInTheDocument();

    fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
      target: { value: 'csv' },
    });
    fireEvent.click(getByTestId('nextButton'));

    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    expect(getByTestId('createDatasetWizardReviewName')).toHaveTextContent('logs-dataset');
    expect(getByTestId('createDatasetWizardReviewDataSource')).toHaveTextContent('source-1');

    fireEvent.click(getByTestId('nextButton'));
    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'logs-dataset',
          data_source: 'source-1',
          resource: 'bucket/*',
        })
      );
      expect(loadDataSets).toHaveBeenCalledTimes(1);
      expect(history.location.pathname).toBe(DATASETS_PATH);
    });
  });

  it('keeps next and back enabled on the advanced step when format is empty', async () => {
    const { getByTestId } = renderWizard();

    fireEvent.change(getByTestId('createDatasetFlyoutDataSource'), {
      target: { value: 'source-1' },
    });
    fireEvent.change(getByTestId('createDatasetFlyoutName'), {
      target: { value: 'logs-dataset' },
    });
    fireEvent.change(getByTestId('createDatasetFlyoutResource'), {
      target: { value: 'bucket/*' },
    });

    fireEvent.click(getByTestId('nextButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardAdvancedStep'))).toBeInTheDocument();

    expect(getByTestId('backButton')).toBeEnabled();
    expect(getByTestId('nextButton')).toBeEnabled();

    fireEvent.click(getByTestId('nextButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();

    fireEvent.click(getByTestId('backButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardAdvancedStep'))).toBeInTheDocument();

    fireEvent.click(getByTestId('backButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardDatasetStep'))).toBeInTheDocument();
  });
});
