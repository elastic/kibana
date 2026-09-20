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

import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import type { DataSetWithName, DataSource } from '../../common';
import { CREATE_DATASET_PATH, DATASETS_PATH } from '../app_paths';
import { CreateDatasetWizardPage } from './create_dataset_wizard_page';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';

const docLinksMock = {
  links: {
    elasticsearch: {
      mappingReference: 'https://www.elastic.co/docs/reference/elasticsearch/mapping-reference',
      mappingKeyword:
        'https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword',
      mappingBoolean:
        'https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/boolean',
      mappingIp: 'https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/ip',
      mappingDate: 'https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/date',
      mappingUnsignedLong:
        'https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/unsigned-long',
      mappingNumber: 'https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/number',
    },
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
  const selectFormat = (getByTestId: ReturnType<typeof render>['getByTestId'], format: string) => {
    fireEvent.click(getByTestId('createDatasetSettingsFormat'));
    fireEvent.click(getByTestId(`createDatasetSettingsFormatOption-${format}`));
  };

  const dataSources: DataSource[] = [
    { name: 'source-1', type: 's3', description: '', settings: {} },
  ];

  const renderWizard = () => {
    const history = createMemoryHistory({ initialEntries: [CREATE_DATASET_PATH] });
    const add = jest.fn().mockResolvedValue(undefined);
    const loadDataSets = jest.fn().mockResolvedValue(undefined);
    const view = render(
      <EuiProvider>
        <MockAppHeaderProvider>
          <Router history={history}>
            <KibanaContextProvider
              services={{
                docLinks: docLinksMock,
                datasetsClient: { add },
                dataSourcesClient: { add: jest.fn() },
              }}
            >
              <CreateDatasetWizardPage
                dataSources={dataSources}
                existingDataSetNames={[]}
                loadDataSets={loadDataSets}
                loadDataSources={jest.fn().mockResolvedValue(undefined)}
              />
            </KibanaContextProvider>
          </Router>
        </MockAppHeaderProvider>
      </EuiProvider>
    );
    return { ...view, history, add, loadDataSets };
  };

  it('walks through dataset, advanced, and confirm steps then saves', async () => {
    const {
      getByTestId,
      getByText,
      queryByTestId,
      queryByText,
      findByTestId,
      history,
      add,
      loadDataSets,
    } = renderWizard();

    expect(getByTestId('appHeaderTitle')).toHaveTextContent(createDatasetWizardStrings.pageTitle);
    expect(getByTestId('appHeaderBack')).toHaveAttribute(
      'aria-label',
      `Back to ${createDatasetWizardStrings.backToListLabel}`
    );
    expect(getByTestId('createDatasetWizardContent')).toBeInTheDocument();
    expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();
    expect(getByTestId('createDatasetResource')).toBeInTheDocument();
    expect(getByText('Select an existing data source or connect a new one')).toBeInTheDocument();
    expect(queryByText('Select the external data source this dataset belongs to.')).toBeNull();
    expect(getByText('Dataset name')).toBeInTheDocument();
    expect(getByText(createDatasetWizardStrings.nameHelp)).toBeInTheDocument();
    expect(getByTestId('createDatasetName')).toHaveAttribute('placeholder', 'e.g. my-dataset');
    expect(getByText('Description (optional)')).toBeInTheDocument();
    expect(getByText('A brief description to identify this dataset')).toBeInTheDocument();
    expect(getByTestId('createDatasetDescription')).not.toHaveAttribute('placeholder');
    expect(getByText(createDatasetWizardStrings.resourceHelp)).toBeInTheDocument();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    expect(await findByTestId('createDatasetDataSource-connectNew')).toHaveTextContent(
      'Connect new data source'
    );
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'logs-dataset' },
    });
    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 'bucket/*' },
    });
    selectFormat(getByTestId, 'csv');

    fireEvent.click(getByTestId('nextButton'));
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    expect(queryByTestId('createDatasetSettingsFormat')).toBeNull();
    expect(getByTestId('createDatasetSettingsPartitionDetection')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsFileExclusions')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsPartitionPath')).toBeInTheDocument();
    fireEvent.change(getByTestId('createDatasetSettingsPartitionDetection'), {
      target: { value: 'hive' },
    });

    fireEvent.click(getByTestId('backButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardDatasetStep'))).toBeInTheDocument();
    fireEvent.click(getByTestId('nextButton'));
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    fireEvent.click(getByTestId('nextButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    fireEvent.click(getByTestId('nextButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    fireEvent.click(getByTestId('backButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();

    fireEvent.click(getByTestId('nextButton'));

    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    expect(getByTestId('createDatasetWizardReviewName')).toHaveTextContent('logs-dataset');
    expect(getByTestId('createDatasetWizardReviewDataSource')).toHaveTextContent('source-1');
    expect(getByTestId('createDatasetWizardReviewFormat')).toHaveTextContent('csv');
    expect(getByTestId('createDatasetWizardReviewPartitionDetection')).toHaveTextContent('hive');

    fireEvent.click(getByTestId('nextButton'));
    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'logs-dataset',
          data_source: 'source-1',
          resource: 'bucket/*',
          settings: expect.objectContaining({ format: 'csv', partition_detection: 'hive' }),
        })
      );
      expect(loadDataSets).toHaveBeenCalledTimes(1);
      expect(history.location.pathname).toBe(DATASETS_PATH);
    });
  });

  it('requires format before leaving the dataset step', async () => {
    const { getByTestId, queryByTestId, findByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'logs-dataset' },
    });
    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 'bucket/*' },
    });

    expect(getByTestId('createDatasetSettingsFormat')).toBeInTheDocument();
    expect(queryByTestId('createDatasetSettingsPartitionDetection')).toBeNull();

    fireEvent.click(getByTestId('nextButton'));
    expect(queryByTestId('createDatasetWizardAdditionalStep')).toBeNull();
    expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();

    selectFormat(getByTestId, 'parquet');
    fireEvent.click(getByTestId('nextButton'));
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
  });

  it('prefills the wizard in edit mode and saves updates', async () => {
    const history = createMemoryHistory({ initialEntries: ['/datasets/edit/logs-dataset'] });
    const add = jest.fn().mockResolvedValue(undefined);
    const remove = jest.fn().mockResolvedValue(undefined);
    const loadDataSets = jest.fn().mockResolvedValue(undefined);
    const initialDataSet: DataSetWithName = {
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 'bucket/*',
      description: '',
      settings: { format: 'csv', partition_detection: 'hive' },
    };

    const { getByTestId } = render(
      <EuiProvider>
        <MockAppHeaderProvider>
          <Router history={history}>
            <KibanaContextProvider
              services={{
                docLinks: docLinksMock,
                datasetsClient: { add, delete: remove },
                dataSourcesClient: { add: jest.fn() },
              }}
            >
              <CreateDatasetWizardPage
                dataSources={dataSources}
                existingDataSetNames={['logs-dataset']}
                loadDataSets={loadDataSets}
                loadDataSources={jest.fn().mockResolvedValue(undefined)}
                initialDataSet={initialDataSet}
              />
            </KibanaContextProvider>
          </Router>
        </MockAppHeaderProvider>
      </EuiProvider>
    );

    expect(getByTestId('appHeaderTitle')).toHaveTextContent('Edit dataset: logs-dataset');
    expect(getByTestId('createDatasetName')).toHaveValue('logs-dataset');
    expect(getByTestId('createDatasetResource')).toHaveValue('bucket/*');

    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 'bucket/updated/*' },
    });
    fireEvent.click(getByTestId('nextButton'));
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    fireEvent.click(getByTestId('nextButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    fireEvent.click(getByTestId('nextButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    fireEvent.click(getByTestId('nextButton'));

    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'logs-dataset',
          resource: 'bucket/updated/*',
        })
      );
      expect(remove).not.toHaveBeenCalled();
      expect(loadDataSets).toHaveBeenCalledTimes(1);
      expect(history.location.pathname).toBe(DATASETS_PATH);
    });
  });

  it('deletes the previous dataset when the name changes in edit mode', async () => {
    const history = createMemoryHistory({ initialEntries: ['/datasets/edit/logs-dataset'] });
    const add = jest.fn().mockResolvedValue(undefined);
    const remove = jest.fn().mockResolvedValue(undefined);
    const initialDataSet: DataSetWithName = {
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 'bucket/*',
      description: '',
      settings: { format: 'csv' },
    };

    const { getByTestId } = render(
      <EuiProvider>
        <MockAppHeaderProvider>
          <Router history={history}>
            <KibanaContextProvider
              services={{
                docLinks: docLinksMock,
                datasetsClient: { add, delete: remove },
                dataSourcesClient: { add: jest.fn() },
              }}
            >
              <CreateDatasetWizardPage
                dataSources={dataSources}
                existingDataSetNames={['logs-dataset']}
                loadDataSets={jest.fn().mockResolvedValue(undefined)}
                loadDataSources={jest.fn().mockResolvedValue(undefined)}
                initialDataSet={initialDataSet}
              />
            </KibanaContextProvider>
          </Router>
        </MockAppHeaderProvider>
      </EuiProvider>
    );

    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'renamed-dataset' },
    });
    fireEvent.click(getByTestId('nextButton'));
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    fireEvent.click(getByTestId('nextButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    fireEvent.click(getByTestId('nextButton'));
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    fireEvent.click(getByTestId('nextButton'));

    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ name: 'renamed-dataset' }));
      expect(remove).toHaveBeenCalledWith('logs-dataset');
    });
  });
});
