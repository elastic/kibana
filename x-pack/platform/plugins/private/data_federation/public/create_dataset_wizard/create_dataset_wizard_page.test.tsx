/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';

import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { I18nProvider } from '@kbn/i18n-react';
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
  const clickNext = async (getByTestId: ReturnType<typeof render>['getByTestId']) => {
    await act(async () => {
      fireEvent.click(getByTestId('nextButton'));
    });
  };

  const clickBack = async (getByTestId: ReturnType<typeof render>['getByTestId']) => {
    await act(async () => {
      fireEvent.click(getByTestId('backButton'));
    });
  };

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
        <I18nProvider>
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
        </I18nProvider>
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

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    expect(queryByTestId('createDatasetSettingsFormat')).toBeNull();
    expect(getByTestId('createDatasetSettingsPartitionDetection')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsFileExclusions')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsPartitionPath')).toBeInTheDocument();
    const partitionDetectionCombo = getByTestId('createDatasetSettingsPartitionDetection');
    fireEvent.click(partitionDetectionCombo.querySelector('input') ?? partitionDetectionCombo);
    fireEvent.click(getByTestId('createDatasetSettingsPartitionDetectionOption-hive'));

    await clickBack(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardDatasetStep'))).toBeInTheDocument();
    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    fireEvent.change(getByTestId('createDatasetWizardTimestampPath'), {
      target: { value: 'event_time' },
    });
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    await clickBack(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();

    fireEvent.change(getByTestId('createDatasetWizardTimestampPath'), {
      target: { value: 'event_time' },
    });
    await clickNext(getByTestId);

    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    expect(getByTestId('createDatasetWizardReviewName')).toHaveTextContent('logs-dataset');
    expect(getByTestId('createDatasetWizardReviewDataSource')).toHaveTextContent('source-1');
    expect(getByTestId('createDatasetWizardReviewFormat')).toHaveTextContent('csv');
    expect(getByTestId('createDatasetWizardReviewPartitionDetection')).toHaveTextContent('hive');

    await clickNext(getByTestId);
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

  it('auto-selects format from resource extension', async () => {
    const { getByTestId, findByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'logs-dataset' },
    });
    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 'bucket/access/**/*.parquet' },
    });

    // No manual format selection. The path extension should infer parquet and allow navigation.
    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
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

    await clickNext(getByTestId);
    expect(queryByTestId('createDatasetWizardAdditionalStep')).toBeNull();
    expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();

    selectFormat(getByTestId, 'parquet');
    await clickNext(getByTestId);
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
      settings: {
        format: 'csv',
        partition_detection: 'hive',
        // passthrough-only additional settings should be preserved unchanged on edit
        target_split_size: '64mb',
        split_probe_window: '16mb',
        schema_sample_size: 5000,
        segment_size: '32mb',
        comment: '#',
        multi_value_syntax: 'brackets',
        max_field_size: 1048576,
        region: 'us-east-1',
        file_sort_by: ['mtime'],
        file_order: 'desc',
      },
    };

    const { getByTestId, queryByTestId } = render(
      <EuiProvider>
        <I18nProvider>
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
        </I18nProvider>
      </EuiProvider>
    );

    expect(getByTestId('appHeaderTitle')).toHaveTextContent('Edit dataset: logs-dataset');
    expect(getByTestId('createDatasetName')).toHaveValue('logs-dataset');
    expect(getByTestId('createDatasetResource')).toHaveValue('bucket/*');

    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 'bucket/updated/*' },
    });
    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    const timestampPathInput = queryByTestId('createDatasetWizardTimestampPath');
    if (timestampPathInput) {
      fireEvent.change(timestampPathInput, {
        target: { value: 'event_time' },
      });
    }
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    await clickNext(getByTestId);

    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'logs-dataset',
          resource: 'bucket/updated/*',
          settings: expect.objectContaining({
            target_split_size: '64mb',
            split_probe_window: '16mb',
            schema_sample_size: 5000,
            segment_size: '32mb',
            comment: '#',
            multi_value_syntax: 'brackets',
            max_field_size: 1048576,
            region: 'us-east-1',
            file_sort_by: ['mtime'],
            file_order: 'desc',
          }),
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

    const { getByTestId, queryByTestId } = render(
      <EuiProvider>
        <I18nProvider>
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
        </I18nProvider>
      </EuiProvider>
    );

    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'renamed-dataset' },
    });
    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    const timestampPathInput = queryByTestId('createDatasetWizardTimestampPath');
    if (timestampPathInput) {
      fireEvent.change(timestampPathInput, { target: { value: 'event_time' } });
    }
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    await clickNext(getByTestId);

    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ name: 'renamed-dataset' }));
      expect(remove).toHaveBeenCalledWith('logs-dataset');
    });
  });

  it('preserves API-only settings not managed by the UI when saving edits', async () => {
    const history = createMemoryHistory({ initialEntries: ['/datasets/edit/logs-dataset'] });
    const add = jest.fn().mockResolvedValue(undefined);
    const remove = jest.fn().mockResolvedValue(undefined);
    const loadDataSets = jest.fn().mockResolvedValue(undefined);
    const initialDataSet: DataSetWithName = {
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 'bucket/*',
      description: '',
      settings: {
        format: 'csv',
        max_split_probes: 17,
      },
    };

    const { getByTestId, queryByTestId } = render(
      <EuiProvider>
        <I18nProvider>
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
        </I18nProvider>
      </EuiProvider>
    );

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    const timestampPathInput = queryByTestId('createDatasetWizardTimestampPath');
    if (timestampPathInput) {
      fireEvent.change(timestampPathInput, {
        target: { value: 'event_time' },
      });
    }

    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    await clickNext(getByTestId);

    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'logs-dataset',
          settings: expect.objectContaining({ max_split_probes: 17 }),
        })
      );
      expect(remove).not.toHaveBeenCalled();
      expect(loadDataSets).toHaveBeenCalledTimes(1);
    });
  });

  it('requires at least one mapped field when Define schema is selected', async () => {
    const { getByTestId, findByTestId, queryByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 'bucket/*' } });
    selectFormat(getByTestId, 'csv');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();

    // Keep timeseries enabled, but make it valid.
    fireEvent.change(getByTestId('createDatasetWizardTimestampPath'), {
      target: { value: 'event_time' },
    });

    // Select Define schema (dynamic = false).
    fireEvent.click(getByTestId('createDatasetWizardDefineSchemaCard'));

    // Attempt to proceed.
    await clickNext(getByTestId);

    // Should stay on mapping step and show the error.
    expect(queryByTestId('createDatasetWizardReviewStep')).toBeNull();
    expect(getByTestId('createDatasetWizardDefineSchemaRequiresField')).toBeInTheDocument();
  });

  it('enables timeseries when @timestamp is added via field mappings', async () => {
    const { getByTestId, findByTestId, getByText, queryByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 'bucket/*' } });
    selectFormat(getByTestId, 'csv');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();

    // Disable timeseries and verify the timestamp editor is hidden.
    await act(async () => {
      fireEvent.click(getByTestId('createDatasetWizardTimeseriesToggle'));
    });
    expect(queryByTestId('createDatasetWizardTimestampPath')).toBeNull();

    // Add an @timestamp field via the mapping editor.
    await act(async () => {
      fireEvent.click(getByTestId('dataFederationMappingEditorAddField'));
    });

    await act(async () => {
      fireEvent.change(getByTestId('dataFederationMappingEditorFieldType'), {
        target: { value: 'date_nanos' },
      });
    });
    fireEvent.change(getByTestId('dataFederationMappingEditorFieldName'), {
      target: { value: '@timestamp' },
    });
    fireEvent.change(getByTestId('dataFederationMappingEditorFieldPath'), {
      target: { value: 'event_time' },
    });

    const formatCombo = getByTestId('dataFederationMappingEditorFieldFormat');
    await act(async () => {
      fireEvent.click(formatCombo.querySelector('input') ?? formatCombo);
    });
    await act(async () => {
      fireEvent.click(getByText('yyyy-MM-dd'));
    });

    await act(async () => {
      fireEvent.click(getByTestId('dataFederationMappingEditorDraftAddField'));
    });

    // Timeseries should be enabled and migrated values should populate the timestamp editor.
    expect(getByTestId('createDatasetWizardTimeseriesToggle')).toBeChecked();
    expect(getByTestId('createDatasetWizardTimestampPath')).toHaveValue('event_time');
    expect(getByTestId('createDatasetWizardTimestampType')).toHaveValue('date_nanos');
    const timestampFormatCombo = getByTestId('createDatasetWizardTimestampFormat');
    const timestampFormatInput = timestampFormatCombo.querySelector('input');
    expect(timestampFormatInput).not.toBeNull();
    expect(timestampFormatInput as HTMLInputElement).toHaveValue('yyyy-MM-dd');
  });

  it('still allows Next after navigating back multiple steps', async () => {
    const { getByTestId, findByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 'bucket/*' } });
    selectFormat(getByTestId, 'csv');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();

    fireEvent.change(getByTestId('createDatasetWizardTimestampPath'), {
      target: { value: 'event_time' },
    });
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();

    // Back twice: Review -> Mapping -> Additional settings
    await clickBack(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    await clickBack(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    // Next should still work.
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
  });

  it('blocks navigation when max error ratio is out of range', async () => {
    const { getByTestId, findByTestId, queryByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 'bucket/*' } });
    selectFormat(getByTestId, 'parquet');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    // Parquet shows advanced settings as plain content, so the field is visible here.
    fireEvent.change(getByTestId('createDatasetSettingsMaxErrorRatio'), {
      target: { value: '2' },
    });

    await clickNext(getByTestId);

    // Should remain on Additional settings and not proceed to Mapping.
    expect(queryByTestId('createDatasetWizardMappingStep')).toBeNull();
    expect(getByTestId('createDatasetWizardAdditionalStep')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsMaxErrorRatio')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });
});
