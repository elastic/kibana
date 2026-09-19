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
import type { DataSource, DataSourceWithSecrets } from '../../common';
import { CreateDatasetDetailsFields } from './create_dataset_details_fields';
import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { emptyDatasetFormValues } from './dataset_form_initial_values';

jest.mock('../create_data_source_flyout', () => ({
  CreateDataSourceFlyout: ({
    onSave,
  }: {
    onSave: (dataSource: DataSourceWithSecrets) => Promise<string | null>;
  }) => (
    <div data-test-subj="mockCreateDataSourceFlyout">
      <button
        data-test-subj="mockSaveDataSource"
        onClick={() =>
          void onSave({
            name: 'new-source',
            type: 's3',
            description: '',
            settings: {},
          })
        }
      />
    </div>
  ),
}));

const initialDataSources: DataSource[] = [
  { name: 'source-1', type: 's3', description: '', settings: {} },
];

function Harness({ add }: { add: jest.Mock }) {
  const [dataSources, setDataSources] = useState(initialDataSources);
  const methods = useForm<CreateDatasetFormValues>({
    defaultValues: emptyDatasetFormValues(),
  });

  return (
    <KibanaContextProvider services={{ dataSourcesClient: { add } }}>
      <FormProvider {...methods}>
        <CreateDatasetDetailsFields
          control={methods.control}
          dataSources={dataSources}
          loadDataSources={async () => {
            setDataSources([
              ...dataSources,
              { name: 'new-source', type: 's3', description: '', settings: {} },
            ]);
          }}
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
      <EuiProvider>
        <Harness add={add} />
      </EuiProvider>
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
});
