/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { DataSource, DataSourceWithSecrets } from '../../../common';
import { CreateDatasetDetailsFields } from './create_dataset_details_fields';
import type { CreateDatasetFormValues } from '../create_dataset_form_state';
import { emptyDatasetFormValues } from '../dataset_form_initial_values';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';

jest.mock('../../create_data_source_flyout', () => ({
  CreateDataSourceFlyout: ({
    onSave,
  }: {
    onSave: (dataSource: DataSourceWithSecrets) => Promise<string | null>;
  }) => {
    const [saveError, setSaveError] = jest.requireActual('react').useState(null);
    return (
      <div data-test-subj="mockCreateDataSourceFlyout">
        <button
          data-test-subj="mockSaveDataSource"
          onClick={async () => {
            setSaveError(
              await onSave({
                name: 'new-source',
                type: 's3',
                description: '',
                settings: {},
              })
            );
          }}
        />
        {saveError ? <div data-test-subj="mockSaveDataSourceError">{saveError}</div> : null}
      </div>
    );
  },
}));

const initialDataSources: DataSource[] = [
  { name: 'source-1', type: 's3', description: '', settings: {} },
];

function Harness({
  add,
  loadDataSources,
}: {
  add: jest.Mock;
  loadDataSources?: () => Promise<void>;
}) {
  const [dataSources, setDataSources] = useState(initialDataSources);
  const methods = useForm<CreateDatasetFormValues>({
    defaultValues: emptyDatasetFormValues(),
  });

  return (
    <KibanaContextProvider
      services={{
        dataSourcesClient: { add },
        docLinks: { links: { dataFederation: { authentication: '' } } },
      }}
    >
      <FormProvider {...methods}>
        <CreateDatasetDetailsFields
          control={methods.control}
          dataSources={dataSources}
          loadDataSources={
            loadDataSources ??
            (async () => {
              setDataSources([
                ...dataSources,
                { name: 'new-source', type: 's3', description: '', settings: {} },
              ]);
            })
          }
        />
        <div data-test-subj="selectedDataSource">{methods.watch('data_source')}</div>
      </FormProvider>
    </KibanaContextProvider>
  );
}

describe('CreateDatasetDetailsFields', () => {
  it('opens the create data source flyout and selects the new source after save', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const { getByTestId, findByTestId, queryByTestId } = render(
      <I18nProvider>
        <EuiProvider>
          <Harness add={add} />
        </EuiProvider>
      </I18nProvider>
    );

    fireEvent.click(getByTestId('createDatasetDataSource'));
    await findByTestId('createDatasetDataSource-connectNew');
    const optionEls = Array.from(document.querySelectorAll('[role="listbox"] [role="option"]'));
    expect(optionEls[optionEls.length - 1]).toHaveAttribute(
      'data-test-subj',
      'createDatasetDataSource-connectNew'
    );
    expect(optionEls[optionEls.length - 1]).toHaveTextContent('Connect new data source');
    fireEvent.click(getByTestId('createDatasetDataSource-connectNew'));

    expect(await findByTestId('mockCreateDataSourceFlyout')).toBeInTheDocument();

    fireEvent.click(getByTestId('mockSaveDataSource'));

    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'new-source',
          type: 's3',
        })
      );
      expect(getByTestId('selectedDataSource')).toHaveTextContent('new-source');
    });

    expect(queryByTestId('mockCreateDataSourceFlyout')).toBeNull();

    fireEvent.click(getByTestId('createDatasetDataSource'));
    expect(await findByTestId('createDatasetDataSource-new-source')).toBeInTheDocument();
  });

  it('reports a refresh failure after saving a new data source distinctly from a save failure', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const loadDataSources = jest.fn().mockRejectedValue(new Error('list unavailable'));
    const { getByTestId, findByTestId } = render(
      <I18nProvider>
        <EuiProvider>
          <Harness add={add} loadDataSources={loadDataSources} />
        </EuiProvider>
      </I18nProvider>
    );

    fireEvent.click(getByTestId('createDatasetDataSource'));
    fireEvent.click(await findByTestId('createDatasetDataSource-connectNew'));
    fireEvent.click(await findByTestId('mockSaveDataSource'));

    expect(await findByTestId('mockSaveDataSourceError')).toHaveTextContent(
      createDatasetWizardStrings.dataSourceRefreshAfterSaveError('new-source', 'list unavailable')
    );
    expect(add).toHaveBeenCalledTimes(1);
    expect(getByTestId('mockCreateDataSourceFlyout')).toBeInTheDocument();
    expect(getByTestId('selectedDataSource')).toHaveTextContent('');
  });
});
