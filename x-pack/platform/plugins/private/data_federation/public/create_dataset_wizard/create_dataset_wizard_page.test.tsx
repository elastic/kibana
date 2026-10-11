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
import { useLoadList } from '../use_load_list';
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

  const clickStep = async (
    getByTestId: ReturnType<typeof render>['getByTestId'],
    stepId: string
  ) => {
    await act(async () => {
      fireEvent.click(getByTestId(`createDatasetWizardStep-${stepId}`));
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

  const renderEditWizard = (initialDataSet: DataSetWithName) => {
    const history = createMemoryHistory({
      initialEntries: [`/datasets/edit/${initialDataSet.name}`],
    });
    const add = jest.fn().mockResolvedValue(undefined);
    const remove = jest.fn().mockResolvedValue(undefined);
    const loadDataSets = jest.fn().mockResolvedValue(undefined);
    const view = render(
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
                  existingDataSetNames={[initialDataSet.name]}
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
    return { ...view, history, add, remove, loadDataSets };
  };

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

  it('creates a dataset through the dataset, mapping, and review steps then saves', async () => {
    const { getByTestId, getByText, findByTestId, history, add, loadDataSets } = renderWizard();

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
    fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'logs-dataset' },
    });
    fireEvent.change(getByTestId('createDatasetResource'), {
      target: { value: 's3://bucket/*' },
    });
    selectFormat(getByTestId, 'csv');

    // Additional settings is optional, so the stepper can jump over it.
    await clickStep(getByTestId, 'mapping');
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    // Timeseries is on by default and requires a field name before Next is allowed.
    fireEvent.change(getByTestId('createDatasetWizardTimestampPath'), {
      target: { value: 'event_time' },
    });
    await clickNext(getByTestId);

    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    expect(getByText('Review configuration for logs-dataset')).toBeInTheDocument();
    expect(getByTestId('createDatasetWizardReview-name')).toHaveTextContent('logs-dataset');
    expect(getByTestId('nextButton')).toHaveTextContent(
      createDatasetWizardStrings.addDatasetButton
    );
    expect(getByTestId('nextButton').querySelector('[data-euiicon-type]')).toBeNull();

    await clickNext(getByTestId);
    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'logs-dataset',
          data_source: 'source-1',
          resource: 's3://bucket/*',
          settings: expect.objectContaining({ format: 'csv' }),
        })
      );
      expect(loadDataSets).toHaveBeenCalledTimes(1);
      expect(history.location.pathname).toBe(DATASETS_PATH);
    });
  });

  it('persists common/advanced accordion show/hide state across wizard navigation', async () => {
    const { getByTestId } = renderEditWizard({
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      settings: { format: 'csv' },
    });

    await clickStep(getByTestId, 'settings');
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    const commonAccordion = getByTestId('createDatasetWizardCommonSettings');
    const advancedAccordion = getByTestId('createDatasetWizardAdvancedSettings');

    // Defaults: common open, advanced closed
    expect(commonAccordion).toHaveClass('euiAccordion-isOpen');
    expect(advancedAccordion).not.toHaveClass('euiAccordion-isOpen');

    // Toggle to: common closed, advanced open
    fireEvent.click(
      within(commonAccordion).getByText(createDatasetWizardStrings.commonSettingsSectionTitle)
    );
    fireEvent.click(
      within(advancedAccordion).getByText(createDatasetWizardStrings.advancedSettingsSectionTitle)
    );

    expect(commonAccordion).not.toHaveClass('euiAccordion-isOpen');
    expect(advancedAccordion).toHaveClass('euiAccordion-isOpen');

    // Navigate away and back
    await clickStep(getByTestId, 'dataset');
    expect(await waitFor(() => getByTestId('createDatasetWizardDatasetStep'))).toBeInTheDocument();
    await clickStep(getByTestId, 'settings');
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    // State should persist
    expect(getByTestId('createDatasetWizardCommonSettings')).not.toHaveClass('euiAccordion-isOpen');
    expect(getByTestId('createDatasetWizardAdvancedSettings')).toHaveClass('euiAccordion-isOpen');
  });

  it('prefills the wizard in edit mode and saves updates', async () => {
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

    const { getByTestId, history, add, remove, loadDataSets } = renderEditWizard(initialDataSet);

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
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    expect(getByTestId('createDatasetWizardReview-partition_detection')).toHaveTextContent('Hive');
    await clickNext(getByTestId);

    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'logs-dataset',
          resource: 's3://bucket/updated/*',
          settings: expect.objectContaining({
            partition_detection: 'hive',
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
    const initialDataSet: DataSetWithName = {
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      description: '',
      settings: { format: 'csv' },
    };

    const { getByTestId, add, remove } = renderEditWizard(initialDataSet);

    fireEvent.change(getByTestId('createDatasetName'), {
      target: { value: 'renamed-dataset' },
    });
    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    await clickNext(getByTestId);

    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ name: 'renamed-dataset' }));
      expect(remove).toHaveBeenCalledWith('logs-dataset');
    });
  });

  it('shows a delete error distinct from a save error when the previous dataset cannot be deleted', async () => {
    const history = createMemoryHistory({ initialEntries: ['/datasets/edit/logs-dataset'] });
    const add = jest.fn().mockResolvedValue(undefined);
    const remove = jest.fn().mockRejectedValue(new Error('security_exception: unauthorized'));
    const loadDataSets = jest.fn().mockResolvedValue(undefined);
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

    const callout = await findByTestId('createDatasetWizardSaveError');
    expect(callout).toHaveTextContent(createDatasetWizardStrings.deletePreviousErrorTitle);
    expect(callout).not.toHaveTextContent(createDatasetWizardStrings.saveErrorTitle);
    expect(callout).toHaveTextContent(
      createDatasetWizardStrings.deletePreviousErrorText(
        'renamed-dataset',
        'logs-dataset',
        'security_exception: unauthorized'
      )
    );
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ name: 'renamed-dataset' }));
    expect(loadDataSets).not.toHaveBeenCalled();
    expect(history.location.pathname).toBe('/datasets/edit/logs-dataset');
  });

  it('returns to the datasets list and reports a refresh failure after saving in a toast', async () => {
    const history = createMemoryHistory({ initialEntries: ['/datasets/edit/logs-dataset'] });
    const add = jest.fn().mockResolvedValue(undefined);
    const addDanger = jest.fn();
    const initialDataSet: DataSetWithName = {
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      description: '',
      settings: { format: 'csv' },
    };
    // The initial load succeeds; the refresh after saving fails.
    const getDataSets = jest
      .fn()
      .mockResolvedValueOnce([initialDataSet])
      .mockRejectedValueOnce(new Error('list unavailable'));

    // Wires the wizard to `useLoadList().reload` the same way `Main` does.
    const WizardWithLoadList = () => {
      const { reload } = useLoadList<DataSetWithName>(getDataSets);
      return (
        <CreateDatasetWizardPage
          dataSources={dataSources}
          existingDataSetNames={['logs-dataset']}
          loadDataSets={reload}
          loadDataSources={jest.fn().mockResolvedValue(undefined)}
          initialDataSet={initialDataSet}
        />
      );
    };

    const { getByTestId, queryByTestId } = render(
      <EuiProvider>
        <I18nProvider>
          <MockAppHeaderProvider>
            <Router history={history}>
              <KibanaContextProvider
                services={{
                  docLinks: docLinksMock,
                  datasetsClient: { add, delete: jest.fn() },
                  dataSourcesClient: { add: jest.fn() },
                  toasts: { addDanger },
                }}
              >
                <WizardWithLoadList />
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

    await waitFor(() => expect(history.location.pathname).toBe(DATASETS_PATH));
    expect(add).toHaveBeenCalledTimes(1);
    expect(getDataSets).toHaveBeenCalledTimes(2);
    expect(addDanger).toHaveBeenCalledWith({
      title: createDatasetWizardStrings.refreshAfterSaveErrorTitle('logs-dataset'),
      text: 'list unavailable',
    });
    expect(queryByTestId('createDatasetWizardSaveError')).toBeNull();
  });

  it('shows the save error in a danger callout and stays on the page', async () => {
    const initialDataSet: DataSetWithName = {
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      description: '',
      settings: { format: 'csv' },
    };

    const { getByTestId, findByTestId, history, add } = renderEditWizard(initialDataSet);
    add.mockRejectedValue(new Error('validation_exception: bad resource'));

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    await clickNext(getByTestId);

    const callout = await findByTestId('createDatasetWizardSaveError');
    expect(callout).toHaveClass('euiCallOut--danger');
    expect(callout).toHaveTextContent(createDatasetWizardStrings.saveErrorTitle);
    expect(callout).toHaveTextContent('validation_exception: bad resource');
    const testSubjsInDocumentOrder = Array.from(
      document.querySelectorAll(
        '[data-test-subj="createDatasetWizardReviewStep"], [data-test-subj="createDatasetWizardSaveError"], [data-test-subj="nextButton"]'
      ),
      (element) => element.getAttribute('data-test-subj')
    );
    expect(testSubjsInDocumentOrder).toEqual([
      'createDatasetWizardReviewStep',
      'createDatasetWizardSaveError',
      'nextButton',
    ]);
    expect(history.location.pathname).toBe('/datasets/edit/logs-dataset');
  });

  it('preserves API-only settings not managed by the UI when saving edits', async () => {
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

    const { getByTestId, add, remove, loadDataSets } = renderEditWizard(initialDataSet);

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    await clickNext(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
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

  it('shows a Tab delimiter picked in the form as the separator in the summary', async () => {
    const { getByTestId, findByTestId } = renderEditWizard({
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      settings: { format: 'csv' },
    });

    await clickStep(getByTestId, 'settings');
    await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'));
    const delimiterCombo = getByTestId('createDatasetSettingsDelimiter');
    await act(async () => {
      fireEvent.click(delimiterCombo.querySelector('input') ?? delimiterCombo);
    });
    await act(async () => {
      fireEvent.click(await findByTestId('createDatasetSettingsDelimiterOption-tab'));
    });

    await clickStep(getByTestId, 'review');
    await waitFor(() => getByTestId('createDatasetWizardReviewStep'));

    expect(getByTestId('createDatasetWizardReview-delimiter')).toHaveTextContent('Tab (\\t)Custom');
  });

  it('summarizes the invisible characters of an edited dataset and keeps API-only settings out', async () => {
    const { getByTestId, queryByTestId } = renderEditWizard({
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      description: '',
      settings: {
        format: 'tsv',
        delimiter: '\t',
        null_value: '\t',
        comment: '\t',
        trim_spaces: false,
        file_exclusions: ['**/tmp ', '**/\t*'],
        target_split_size: '512mb',
      },
    });

    await clickStep(getByTestId, 'review');
    await waitFor(() => getByTestId('createDatasetWizardReviewStep'));

    const valueOf = (key: string) => getByTestId(`createDatasetWizardReview-${key}`);
    expect(valueOf('delimiter')).toHaveTextContent('Tab (\\t)Custom');
    expect(valueOf('null_value')).toHaveTextContent('\\tCustom');
    expect(valueOf('trim_spaces')).toHaveTextContent('FalseCustom');
    expect(valueOf('file_exclusions')).toHaveTextContent('"**/tmp ", **/\\t*Custom', {
      normalizeWhitespace: false,
    });
    // Persisted on edit and sent in the request, but intentionally not summarized.
    expect(queryByTestId('createDatasetWizardReview-target_split_size')).toBeNull();
    expect(queryByTestId('createDatasetWizardReview-comment')).toBeNull();
    fireEvent.click(getByTestId('createDatasetWizardReviewRequestTabButton'));
    expect(getByTestId('createDatasetWizardReviewRequest')).toHaveTextContent(
      '"target_split_size": "512mb"'
    );
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
    const testSubjsInDocumentOrder = Array.from(
      document.querySelectorAll(
        '[data-test-subj="dataFederationMappingEditorAddField"], [data-test-subj="createDatasetWizardMappingStepErrors"], [data-test-subj="nextButton"]'
      ),
      (element) => element.getAttribute('data-test-subj')
    );
    expect(testSubjsInDocumentOrder).toEqual([
      'dataFederationMappingEditorAddField',
      'createDatasetWizardMappingStepErrors',
      'nextButton',
    ]);
    expect(getByTestId('nextButton')).toBeDisabled();

    // Fixing the problem clears the error and re-enables Next without clicking it.
    await act(async () => {
      fireEvent.click(getByTestId('createDatasetWizardInferSchemaCard'));
    });
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
    // A saved dataset without mappings starts with timeseries disabled.
    const { getByTestId, getByText, queryByTestId } = renderEditWizard({
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      settings: { format: 'csv' },
    });

    await clickStep(getByTestId, 'mapping');
    expect(await waitFor(() => getByTestId('createDatasetWizardMappingStep'))).toBeInTheDocument();
    expect(getByTestId('createDatasetWizardTimeseriesToggle')).not.toBeChecked();
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

    await clickStep(getByTestId, 'mapping');
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
    const { getByTestId } = renderEditWizard({
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      settings: { format: 'parquet' },
    });

    await clickStep(getByTestId, 'review');
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

  it('discards the combo box selection error when its typed text is discarded by leaving the step', async () => {
    const { getByTestId, findByText, queryByText } = renderEditWizard({
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      settings: { format: 'parquet' },
    });

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    const input = getByTestId('createDatasetSettingsPartitionDetection').querySelector('input');
    if (!input) throw new Error('partition detection input not found');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'bogus' } });
      fireEvent.blur(input);
    });
    await clickNext(getByTestId);
    expect(
      await findByText(createDatasetWizardStrings.comboBoxSelectValidOption)
    ).toBeInTheDocument();

    await clickBack(getByTestId);
    expect(await waitFor(() => getByTestId('createDatasetWizardDatasetStep'))).toBeInTheDocument();
    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    expect(
      getByTestId('createDatasetSettingsPartitionDetection').querySelector('input')
    ).toHaveValue('');
    expect(queryByText(createDatasetWizardStrings.comboBoxSelectValidOption)).toBeNull();
    expect(getByTestId('nextButton')).toBeEnabled();
  });

  it('allows Back after a failed Next leaves an invalid additional setting', async () => {
    const { getByTestId, getByText, queryByTestId } = renderEditWizard({
      name: 'logs-dataset',
      data_source: 'source-1',
      resource: 's3://bucket/*',
      settings: { format: 'csv', delimiter: 'ab' },
    });

    await clickNext(getByTestId);
    expect(
      await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
    ).toBeInTheDocument();

    await clickNext(getByTestId);
    expect(queryByTestId('createDatasetWizardMappingStep')).toBeNull();
    expect(getByText(createDatasetWizardStrings.settingsDelimiterInvalid)).toBeInTheDocument();
    await waitFor(() => expect(getByTestId('nextButton')).toBeDisabled());
    expect(getByTestId('backButton')).toBeEnabled();

    await clickBack(getByTestId);

    expect(await waitFor(() => getByTestId('createDatasetWizardDatasetStep'))).toBeInTheDocument();
    expect(queryByTestId('createDatasetWizardAdditionalStep')).toBeNull();
  });

  describe('create mode step navigation', () => {
    const fillDatasetStep = async ({
      getByTestId,
      findByTestId,
    }: Pick<ReturnType<typeof render>, 'getByTestId' | 'findByTestId'>) => {
      fireEvent.click(getByTestId('createDatasetDataSource'));
      fireEvent.click(await findByTestId('createDatasetDataSource-source-1'));
      fireEvent.change(getByTestId('createDatasetName'), { target: { value: 'logs-dataset' } });
      fireEvent.change(getByTestId('createDatasetResource'), {
        target: { value: 's3://bucket/*' },
      });
      selectFormat(getByTestId, 'csv');
      // Let the format popover finish closing before asserting.
      await act(async () => {});
    };

    it('allows skipping the optional Additional settings step but not the Mapping step', async () => {
      const { getByTestId, findByTestId, queryByTestId } = renderWizard();
      await fillDatasetStep({ getByTestId, findByTestId });

      expect(getByTestId('createDatasetWizardStep-mapping')).toBeEnabled();
      expect(getByTestId('createDatasetWizardStep-review')).toBeDisabled();

      await clickStep(getByTestId, 'mapping');
      expect(
        await waitFor(() => getByTestId('createDatasetWizardMappingStep'))
      ).toBeInTheDocument();
      expect(queryByTestId('createDatasetWizardAdditionalStep')).toBeNull();

      fireEvent.change(getByTestId('createDatasetWizardTimestampPath'), {
        target: { value: 'event_time' },
      });
      await clickStep(getByTestId, 'dataset');
      expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();
      expect(getByTestId('createDatasetWizardStep-review')).toBeEnabled();

      await clickStep(getByTestId, 'review');
      expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
    });

    it('does not allow skipping Additional settings once it was left invalid', async () => {
      const { getByTestId, findByTestId } = renderWizard();
      await fillDatasetStep({ getByTestId, findByTestId });

      await clickNext(getByTestId);
      expect(
        await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
      ).toBeInTheDocument();
      fireEvent.change(getByTestId('createDatasetSettingsEscape'), { target: { value: '\\a' } });
      await clickBack(getByTestId);
      expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();

      expect(getByTestId('createDatasetWizardStep-mapping')).toBeDisabled();
      expect(getByTestId('createDatasetWizardStep-settings')).toBeEnabled();
    });
  });

  describe('edit mode step navigation', () => {
    it('allows jumping to any step when the saved settings are valid', async () => {
      const { getByTestId, add } = renderEditWizard({
        name: 'logs-dataset',
        data_source: 'source-1',
        resource: 's3://bucket/*',
        settings: { format: 'csv', delimiter: ';' },
      });

      expect(getByTestId('createDatasetWizardStep-settings')).toBeEnabled();
      expect(getByTestId('createDatasetWizardStep-mapping')).toBeEnabled();
      expect(getByTestId('createDatasetWizardStep-review')).toBeEnabled();

      await clickStep(getByTestId, 'review');
      expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();
      await clickStep(getByTestId, 'mapping');
      expect(
        await waitFor(() => getByTestId('createDatasetWizardMappingStep'))
      ).toBeInTheDocument();
      await clickStep(getByTestId, 'review');
      expect(await waitFor(() => getByTestId('createDatasetWizardReviewStep'))).toBeInTheDocument();

      await clickNext(getByTestId);
      await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    });

    it('does not allow skipping a step whose saved settings are invalid', async () => {
      const { getByTestId, queryByTestId, add } = renderEditWizard({
        name: 'logs-dataset',
        data_source: 'source-1',
        resource: 's3://bucket/*',
        settings: { format: 'csv', delimiter: 'ab' },
      });

      expect(getByTestId('createDatasetWizardStep-settings')).toBeEnabled();
      expect(getByTestId('createDatasetWizardStep-review')).toBeDisabled();
      await clickStep(getByTestId, 'review');
      expect(queryByTestId('createDatasetWizardReviewStep')).toBeNull();
      expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();
      expect(add).not.toHaveBeenCalled();
    });

    it('does not allow skipping a step that was left invalid via Back', async () => {
      const { getByTestId, queryByTestId, add } = renderEditWizard({
        name: 'logs-dataset',
        data_source: 'source-1',
        resource: 's3://bucket/*',
        settings: { format: 'csv' },
      });

      expect(getByTestId('createDatasetWizardStep-review')).toBeEnabled();

      // Make Additional settings invalid, then leave it via Back without fixing it.
      await clickNext(getByTestId);
      expect(
        await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
      ).toBeInTheDocument();
      fireEvent.change(getByTestId('createDatasetSettingsEscape'), { target: { value: '\\a' } });
      await clickBack(getByTestId);
      expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();

      expect(getByTestId('createDatasetWizardStep-review')).toBeDisabled();
      expect(getByTestId('createDatasetWizardStep-mapping')).toBeDisabled();
      await clickStep(getByTestId, 'review');
      expect(queryByTestId('createDatasetWizardReviewStep')).toBeNull();
      expect(add).not.toHaveBeenCalled();

      // The invalid step itself can still be reached and fixed.
      await clickStep(getByTestId, 'settings');
      expect(
        await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
      ).toBeInTheDocument();
    });

    it('does not allow skipping Additional settings once a format change makes them invalid', async () => {
      const { getByTestId, queryByTestId, add } = renderEditWizard({
        name: 'logs-dataset',
        data_source: 'source-1',
        resource: 's3://bucket/*',
        settings: { format: 'tsv', delimiter: '"' },
      });

      expect(getByTestId('createDatasetWizardStep-review')).toBeEnabled();

      // CSV's default quote is also `"`, so the saved delimiter now conflicts with it.
      selectFormat(getByTestId, 'csv');
      await act(async () => {});

      await clickStep(getByTestId, 'review');
      expect(queryByTestId('createDatasetWizardReviewStep')).toBeNull();
      expect(getByTestId('createDatasetWizardDatasetStep')).toBeInTheDocument();
      await clickStep(getByTestId, 'mapping');
      expect(queryByTestId('createDatasetWizardMappingStep')).toBeNull();
      expect(add).not.toHaveBeenCalled();

      await clickStep(getByTestId, 'settings');
      expect(
        await waitFor(() => getByTestId('createDatasetWizardAdditionalStep'))
      ).toBeInTheDocument();
      await clickNext(getByTestId);
      expect(queryByTestId('createDatasetWizardMappingStep')).toBeNull();
      expect(
        getByTestId('createDatasetWizardAdditionalStep').textContent?.includes(
          createDatasetWizardStrings.settingsCsvCharactersNotDistinct
        )
      ).toBe(true);
    });
  });
});
