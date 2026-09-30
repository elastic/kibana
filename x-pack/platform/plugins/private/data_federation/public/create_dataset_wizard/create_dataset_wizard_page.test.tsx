/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';

import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import type { DataSetWithName, DataSource } from '../../common';
import { CREATE_DATASET_PATH, DATASETS_PATH } from '../app_paths';
import { CreateDatasetWizardPage } from './create_dataset_wizard_page';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';

// `CreateDatasetWizardPage` reaches `@kbn/monaco` through code editors used in the mapping step.
// Loading the real module pulls in Monaco language registration which evaluates generated i18n
// messages at import time (and can throw in Jest).
/* eslint-disable @kbn/imports/no_direct_monaco_import */
jest.mock('@kbn/monaco', () => ({ PainlessLang: { ID: 'painless' } }));

jest.mock('@kbn/code-editor', () => ({
  // A plain textarea stands in for Monaco; loading the real module drags in every Monaco language.
  CodeEditor: ({ value }: { value?: string }) => (
    <textarea data-test-subj="mockCodeEditor" value={value ?? ''} readOnly />
  ),
}));

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
    const { getByTestId, getByText, queryByTestId, findByTestId, history, add, loadDataSets } =
      renderWizard();

    expect(getByTestId('appHeaderTitle')).toHaveTextContent(createDatasetWizardStrings.pageTitle);
    expect(getByTestId('appHeaderBack')).toHaveAttribute(
      'aria-label',
      `Back to ${createDatasetWizardStrings.backToListLabel}`
    );
    expect(getByTestId('createDatasetWizardContent')).toBeInTheDocument();
    expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();
    expect(getByTestId('createDatasetResource')).toBeInTheDocument();
    expect(getByText('Dataset name')).toBeInTheDocument();
    expect(getByText(createDatasetWizardStrings.nameHelp)).toBeInTheDocument();
    expect(getByTestId('createDatasetName')).toHaveAttribute(
      'placeholder',
      createDatasetWizardStrings.namePlaceholder
    );
    expect(getByText('Description (optional)')).toBeInTheDocument();
    expect(getByText(createDatasetWizardStrings.descriptionHelp)).toBeInTheDocument();
    expect(getByTestId('createDatasetDescription')).not.toHaveAttribute('placeholder');
    // Resource help text is rendered via FormattedMessage with an embedded example code snippet,
    // so assert on the input rather than the exact composed help text.
    expect(getByText(createDatasetWizardStrings.resourceLabel)).toBeInTheDocument();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    expect(await findByTestId('createDatasetDataSource-connectNew')).toHaveTextContent(
      'Connect new data source'
    );
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'logs-dataset' },
    });
    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 's3://bucket/*' },
    });
    selectFormat(getByTestId, 'csv');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    expect(queryByTestId('createDatasetSettingsFormat')).toBeNull();
    expect(getByTestId('createDatasetSettingsPartitionDetection')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsFileExclusions')).toBeInTheDocument();
    expect(queryByTestId('createDatasetSettingsPartitionPath')).toBeNull();
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
    // Timeseries is on by default and requires a field name before Next is allowed.
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
    expect(getByText('Review configuration for logs-dataset')).toBeInTheDocument();
    expect(getByTestId('createDatasetWizardReview-name')).toHaveTextContent('logs-dataset');
    expect(getByTestId('createDatasetWizardReview-partition_detection')).toHaveTextContent('Hive');
    expect(getByTestId('nextButton')).toHaveTextContent(
      createDatasetWizardStrings.saveDatasetButton
    );

    await clickNext(getByTestId);
    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'logs-dataset',
          data_source: 'source-1',
          resource: 's3://bucket/*',
          settings: expect.objectContaining({ format: 'csv', partition_detection: 'hive' }),
        })
      );
      expect(loadDataSets).toHaveBeenCalledTimes(1);
      expect(history.location.pathname).toBe(DATASETS_PATH);
    });
  });

  it('persists common/advanced accordion show/hide state across wizard navigation', async () => {
    const { getByTestId, findByTestId } = renderWizard();

    // Complete required dataset step fields so we can reach Additional settings
    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'logs-dataset' },
    });
    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 's3://bucket/*' },
    });
    selectFormat(getByTestId, 'csv');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    const commonAccordion = getByTestId('createDatasetWizardCommonSettings');
    const advancedAccordion = getByTestId('createDatasetWizardAdvancedSettings');

    // Defaults: common open, advanced closed
    expect(commonAccordion).toHaveClass('euiAccordion-isOpen');
    expect(advancedAccordion).not.toHaveClass('euiAccordion-isOpen');

    // Toggle to: common closed, advanced open
    fireEvent.click(within(commonAccordion).getByRole('button', { expanded: true }));
    fireEvent.click(within(advancedAccordion).getByRole('button', { expanded: false }));

    expect(commonAccordion).not.toHaveClass('euiAccordion-isOpen');
    expect(advancedAccordion).toHaveClass('euiAccordion-isOpen');

    // Navigate away and back
    await clickBack(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardDatasetStep'))).toBeInTheDocument();
    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    // State should persist
    expect(getByTestId('createDatasetWizardCommonSettings')).not.toHaveClass('euiAccordion-isOpen');
    expect(getByTestId('createDatasetWizardAdvancedSettings')).toHaveClass('euiAccordion-isOpen');
  });

  it('auto-selects format from resource extension', async () => {
    const { getByTestId, findByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'logs-dataset' },
    });
    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 's3://bucket/access/**/*.parquet' },
    });

    // No manual format selection. The path extension should infer parquet and allow navigation.
    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
  });

  it('clears the name error as soon as the name becomes valid without clicking Next', async () => {
    const { getByTestId, queryByText, findByText } = renderWizard();

    await clickNext(getByTestId);
    expect(await findByText(createDatasetWizardStrings.nameRequired)).toBeInTheDocument();
    expect(getByTestId('createDatasetName')).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'logs-dataset' },
    });

    await waitFor(() => {
      expect(queryByText(createDatasetWizardStrings.nameRequired)).toBeNull();
    });
    expect(getByTestId('createDatasetName')).not.toHaveAttribute('aria-invalid', 'true');
    expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();
  });

  it('disables Next after a failed attempt while a non-empty field is still invalid', async () => {
    const { getByTestId, findByTestId, findByText } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'logs-dataset' },
    });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 'x' } });
    selectFormat(getByTestId, 'csv');

    expect(getByTestId('nextButton')).toBeEnabled();
    await clickNext(getByTestId);
    expect(await findByText(createDatasetWizardStrings.resourceInvalid)).toBeInTheDocument();
    expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();
    await waitFor(() => expect(getByTestId('nextButton')).toBeDisabled());

    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 's3://bucket/*' },
    });
    await waitFor(() => expect(getByTestId('nextButton')).toBeEnabled());
  });

  it('requires format before leaving the dataset step', async () => {
    const { getByTestId, queryByTestId, findByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'logs-dataset' },
    });
    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 's3://bucket/*' },
    });

    expect(getByTestId('createDatasetSettingsFormat')).toBeInTheDocument();
    expect(queryByTestId('createDatasetSettingsPartitionDetection')).toBeNull();

    await clickNext(getByTestId);
    expect(queryByTestId('createDatasetWizardAdditionalStep')).toBeNull();
    expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();

    await waitFor(() => expect(getByTestId('nextButton')).toBeDisabled());
    selectFormat(getByTestId, 'parquet');
    await waitFor(() => expect(getByTestId('nextButton')).toBeEnabled());
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
      resource: 's3://bucket/*',
      description: '',
      settings: {
        format: 'csv',
        partition_detection: 'hive',
        // passthrough-only additional settings should be preserved unchanged on edit
        target_split_size: '64mb',
        split_probe_window: '16mb',
        schema_sample_size: 5000,
        comment: '#',
        multi_value_syntax: 'brackets',
        max_field_size: 1048576,
        region: 'us-east-1',
        file_sort_by: 'mtime',
        file_order: 'desc',
        partition_sample_size: '100',
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
    expect(getByTestId('createDatasetResource')).toHaveValue('s3://bucket/*');

    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 's3://bucket/updated/*' },
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
          resource: 's3://bucket/updated/*',
          settings: expect.objectContaining({
            target_split_size: '64mb',
            split_probe_window: '16mb',
            schema_sample_size: 5000,
            comment: '#',
            multi_value_syntax: 'brackets',
            max_field_size: 1048576,
            region: 'us-east-1',
            file_sort_by: 'mtime',
            file_order: 'desc',
            partition_sample_size: '100',
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
      resource: 's3://bucket/*',
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

  it('shows the save error in a danger callout and stays on the page', async () => {
    const history = createMemoryHistory({ initialEntries: ['/datasets/edit/logs-dataset'] });
    const add = jest.fn().mockRejectedValue(new Error('validation_exception: bad resource'));
    const initialDataSet: DataSetWithName = {
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      description: '',
      settings: { format: 'csv' },
    };

    const { getByTestId, queryByTestId, findByTestId } = render(
      <EuiProvider>
        <I18nProvider>
          <MockAppHeaderProvider>
            <Router history={history}>
              <KibanaContextProvider
                services={{
                  docLinks: docLinksMock,
                  datasetsClient: { add, delete: jest.fn() },
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

    const callout = await findByTestId('createDatasetWizardSaveError');
    expect(callout).toHaveClass('euiCallOut--danger');
    expect(callout).toHaveTextContent(createDatasetWizardStrings.saveErrorTitle);
    expect(callout).toHaveTextContent('validation_exception: bad resource');
    expect(history.location.pathname).toBe('/datasets/edit/logs-dataset');
  });

  it('preserves API-only settings not managed by the UI when saving edits', async () => {
    const history = createMemoryHistory({ initialEntries: ['/datasets/edit/logs-dataset'] });
    const add = jest.fn().mockResolvedValue(undefined);
    const remove = jest.fn().mockResolvedValue(undefined);
    const loadDataSets = jest.fn().mockResolvedValue(undefined);
    const initialDataSet: DataSetWithName = {
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      description: '',
      settings: {
        format: 'csv',
        // passthrough-only additional settings should be preserved unchanged on edit
        target_split_size: '512mb',
        split_probe_window: '64mb',
        max_split_probes: 17,
        schema_sample_size: 100,
        comment: '#',
        multi_value_syntax: 'brackets',
        max_field_size: 2048,
        region: 'us-east-1',
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
          settings: expect.objectContaining({
            target_split_size: '512mb',
            split_probe_window: '64mb',
            max_split_probes: 17,
            schema_sample_size: 100,
            comment: '#',
            multi_value_syntax: 'brackets',
            max_field_size: 2048,
            region: 'us-east-1',
          }),
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
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 's3://bucket/*' } });
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
    expect(getByTestId('nextButton')).toBeDisabled();

    // Fixing the problem clears the error and re-enables Next without clicking it.
    fireEvent.click(getByTestId('createDatasetWizardInferSchemaCard'));
    expect(queryByTestId('createDatasetWizardDefineSchemaRequiresField')).toBeNull();
    expect(getByTestId('nextButton')).toBeEnabled();
  });

  it('disables Next on the mapping step until the missing timestamp field name is provided', async () => {
    const { getByTestId, findByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 's3://bucket/*' } });
    selectFormat(getByTestId, 'csv');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();

    expect(getByTestId('nextButton')).toBeEnabled();
    await clickNext(getByTestId);
    expect(getByTestId('createDatasetWizardMappingStep')).toBeInTheDocument();
    expect(getByTestId('createDatasetWizardTimestampPath')).toHaveAttribute('aria-invalid', 'true');
    expect(getByTestId('nextButton')).toBeDisabled();

    fireEvent.change(getByTestId('createDatasetWizardTimestampPath'), {
      target: { value: 'event_time' },
    });
    expect(getByTestId('createDatasetWizardTimestampPath')).not.toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(getByTestId('nextButton')).toBeEnabled();
  });

  it('enables timeseries when @timestamp is added via field mappings', async () => {
    const { getByTestId, findByTestId, getByText, queryByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 's3://bucket/*' } });
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

  it('keeps unsaved edits to a mapped field when the timestamp field name changes', async () => {
    const { getByTestId, getAllByTestId, findByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 's3://bucket/*' } });
    selectFormat(getByTestId, 'csv');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getByTestId('dataFederationMappingEditorAddField'));
    });
    fireEvent.change(getByTestId('dataFederationMappingEditorFieldName'), {
      target: { value: 'oldname' },
    });
    await act(async () => {
      fireEvent.click(getByTestId('dataFederationMappingEditorDraftAddField'));
    });
    expect(getAllByTestId('dataFederationMappingEditorField')).toHaveLength(1);

    await act(async () => {
      fireEvent.click(getByTestId('dataFederationMappingEditorEditField'));
    });
    const mappedField = getByTestId('dataFederationMappingEditorField');
    fireEvent.change(within(mappedField).getByTestId('dataFederationMappingEditorFieldName'), {
      target: { value: 'newname' },
    });

    await act(async () => {
      fireEvent.change(getByTestId('createDatasetWizardTimestampPath'), {
        target: { value: 'timestamp' },
      });
    });
    expect(getByTestId('createDatasetWizardTimestampPath')).toHaveValue('timestamp');

    const editedField = getByTestId('dataFederationMappingEditorField');
    expect(within(editedField).getByTestId('dataFederationMappingEditorUpdateField')).toBeVisible();
    expect(within(editedField).getByTestId('dataFederationMappingEditorFieldName')).toHaveValue(
      'newname'
    );
  });

  it('still allows Next after navigating back multiple steps', async () => {
    const { getByTestId, findByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 's3://bucket/*' } });
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

  it('keeps inferring the format from the resource after navigating back', async () => {
    const { getByTestId, findByTestId, queryByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 's3://bucket/*.csv' },
    });
    expect(await findByTestId('createDatasetSettingsFormatInput-csv')).toHaveTextContent(
      createDatasetWizardStrings.autoDetectedSuffix
    );

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    await clickBack(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardDatasetStep'))).toBeInTheDocument();

    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 's3://bucket/*.parquet' },
    });

    expect(await findByTestId('createDatasetSettingsFormatInput-parquet')).toHaveTextContent(
      createDatasetWizardStrings.autoDetectedSuffix
    );
    expect(queryByTestId('createDatasetSettingsFormatInput-csv')).toBeNull();
  });

  it('keeps a manually selected format when the resource changes after navigating back', async () => {
    const { getByTestId, findByTestId, queryByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 's3://bucket/*.csv' },
    });
    await findByTestId('createDatasetSettingsFormatInput-csv');
    selectFormat(getByTestId, 'tsv');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    await clickBack(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardDatasetStep'))).toBeInTheDocument();

    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 's3://bucket/*.parquet' },
    });

    const formatInput = await findByTestId('createDatasetSettingsFormatInput-tsv');
    expect(formatInput).not.toHaveTextContent(createDatasetWizardStrings.autoDetectedSuffix);
    expect(queryByTestId('createDatasetSettingsFormatInput-parquet')).toBeNull();
  });

  it('blocks navigation when max error ratio is out of range', async () => {
    const { getByTestId, findByTestId, queryByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 's3://bucket/*' } });
    selectFormat(getByTestId, 'parquet');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    // Parquet shows advanced settings as plain content; the ratio field appears once a budgeted error mode is chosen.
    const errorModeCombo = getByTestId('createDatasetSettingsErrorMode');
    await act(async () => {
      fireEvent.click(errorModeCombo.querySelector('input') ?? errorModeCombo);
    });
    await act(async () => {
      fireEvent.click(await findByTestId('createDatasetSettingsErrorModeOption-skip_row'));
    });
    fireEvent.change(await findByTestId('createDatasetSettingsMaxErrorRatio'), {
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

  it('blocks navigation when escape character is invalid', async () => {
    const { getByTestId, findByTestId, queryByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 's3://bucket/*' } });
    selectFormat(getByTestId, 'csv');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    // Open advanced settings to access the escape character input.
    const advancedAccordion = getByTestId('createDatasetWizardAdvancedSettings');
    fireEvent.click(within(advancedAccordion).getByRole('button', { expanded: false }));
    expect(getByTestId('createDatasetWizardAdvancedSettings')).toHaveClass('euiAccordion-isOpen');

    fireEvent.change(getByTestId('createDatasetSettingsEscape'), { target: { value: '\\a' } });

    await clickNext(getByTestId);

    // Should remain on Additional settings and not proceed to Mapping.
    expect(queryByTestId('createDatasetWizardMappingStep')).toBeNull();
    expect(getByTestId('createDatasetWizardAdditionalStep')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsEscape')).toHaveAttribute('aria-invalid', 'true');
  });

  it('allows navigation once an invalid additional setting is fixed', async () => {
    const { getByTestId, findByTestId, queryByTestId } = renderWizard();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
    fireEvent.change(getByTestId('createDatasetResource'), { target: { value: 's3://bucket/*' } });
    selectFormat(getByTestId, 'csv');

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    const advancedAccordion = getByTestId('createDatasetWizardAdvancedSettings');
    fireEvent.click(within(advancedAccordion).getByRole('button', { expanded: false }));

    fireEvent.change(getByTestId('createDatasetSettingsEscape'), { target: { value: '\\a' } });
    await clickNext(getByTestId);
    expect(queryByTestId('createDatasetWizardMappingStep')).toBeNull();
    expect(getByTestId('createDatasetSettingsEscape')).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(getByTestId('nextButton')).toBeDisabled());

    fireEvent.change(getByTestId('createDatasetSettingsEscape'), { target: { value: '/' } });
    await waitFor(() => expect(getByTestId('nextButton')).toBeEnabled());
    expect(getByTestId('createDatasetSettingsEscape')).not.toHaveAttribute('aria-invalid', 'true');
    await clickNext(getByTestId);

    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
  });

  it('blocks navigation when an edited dataset has an invalid delimiter', async () => {
    const history = createMemoryHistory({ initialEntries: ['/datasets/edit/logs-dataset'] });
    const { getByTestId, getByText, queryByTestId } = render(
      <EuiProvider>
        <I18nProvider>
          <MockAppHeaderProvider>
            <Router history={history}>
              <KibanaContextProvider
                services={{
                  docLinks: docLinksMock,
                  datasetsClient: { add: jest.fn(), delete: jest.fn() },
                  dataSourcesClient: { add: jest.fn() },
                }}
              >
                <CreateDatasetWizardPage
                  dataSources={dataSources}
                  existingDataSetNames={['logs-dataset']}
                  loadDataSets={jest.fn().mockResolvedValue(undefined)}
                  loadDataSources={jest.fn().mockResolvedValue(undefined)}
                  initialDataSet={{
                    name: 'logs-dataset',
                    data_source: 'source-1',
                    resource: 's3://bucket/*',
                    settings: { format: 'csv', delimiter: 'ab' },
                  }}
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

    expect(queryByTestId('createDatasetWizardMappingStep')).toBeNull();
    expect(getByTestId('createDatasetWizardAdditionalStep')).toBeInTheDocument();
    expect(getByText(createDatasetWizardStrings.settingsDelimiterInvalid)).toBeInTheDocument();
  });
});
