/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataSetWithName, DataSource } from '../common';
import { DatasetsTabContent } from './datasets_tab_content';
import type { DataFederationKibanaServices } from './types';

type MockDatasetsClient = Pick<DataFederationKibanaServices['datasetsClient'], 'add' | 'delete'>;

jest.mock('./datasets_table', () => ({
  DatasetsTable: (props: Record<string, unknown>) => {
    const filteredItems = (props.filteredItems as any[]) ?? [];
    const selectedItems = (props.selectedItems as any[]) ?? [];

    return (
      <div data-test-subj="mockDatasetsTable">
        <div data-test-subj="mockSelectedCount">{String(selectedItems.length)}</div>
        <div data-test-subj="mockFilterValue">{String(props.dataSourceFilter ?? '')}</div>
        <div data-test-subj="mockCreateDisabled">{String(props.isCreateDisabled)}</div>

        <button data-test-subj="mockCreate" onClick={() => (props.onCreate as any)()} />
        <button
          data-test-subj="mockSelectFirst"
          onClick={() => (props.onSelectionChange as any)([filteredItems[0]])}
        />
        <button
          data-test-subj="mockChangeFilterToDs1"
          onClick={() => (props.onDataSourceFilterChange as any)('ds1')}
        />
        <button
          data-test-subj="mockChangeFilterToMissing"
          onClick={() => (props.onDataSourceFilterChange as any)('missing')}
        />
        <button
          data-test-subj="mockDeleteFirst"
          onClick={() => (props.onDelete as any)(filteredItems[0])}
        />
        <button
          data-test-subj="mockDeleteSelected"
          onClick={() => (props.onDeleteSelected as any)(selectedItems)}
        />
      </div>
    );
  },
}));

jest.mock('./create_dataset_flyout', () => ({
  CreateDatasetFlyout: (props: {
    onClose: () => void;
    onSave: (dataSet: unknown, previousId?: string) => Promise<string | null>;
  }) => (
    <div data-test-subj="mockCreateDatasetFlyout">
      <button data-test-subj="mockFlyoutClose" onClick={props.onClose} />
      <button
        data-test-subj="mockFlyoutSave"
        onClick={() =>
          void props.onSave({
            name: 'my-dataset',
            data_source: 'ds1',
            resource: 'bucket/*',
            description: '',
          })
        }
      />
      <button
        data-test-subj="mockFlyoutSaveRename"
        onClick={() =>
          void props.onSave(
            {
              name: 'renamed-dataset',
              data_source: 'ds1',
              resource: 'bucket/*',
              description: '',
            },
            'previous-dataset'
          )
        }
      />
    </div>
  ),
}));

jest.mock('./confirm_delete_data_set_modal', () => ({
  ConfirmDeleteDataSetModal: (props: {
    dataSetName: string;
    error?: string | null;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div data-test-subj="mockConfirmDeleteDataSetModal">
      <div data-test-subj="mockDeleteName">{props.dataSetName}</div>
      {props.error ? <div data-test-subj="mockDeleteError">{props.error}</div> : null}
      <button data-test-subj="mockConfirmDelete" onClick={props.onConfirm} />
      <button data-test-subj="mockCancelDelete" onClick={props.onCancel} />
    </div>
  ),
}));

jest.mock('./confirm_delete_data_sets_modal', () => ({
  ConfirmDeleteDataSetsModal: (props: {
    dataSetNames: string[];
    error?: string | null;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div data-test-subj="mockConfirmDeleteDataSetsModal">
      <div data-test-subj="mockDeleteNames">{props.dataSetNames.join(',')}</div>
      {props.error ? <div data-test-subj="mockDeleteManyError">{props.error}</div> : null}
      <button data-test-subj="mockConfirmDeleteMany" onClick={props.onConfirm} />
      <button data-test-subj="mockCancelDeleteMany" onClick={props.onCancel} />
    </div>
  ),
}));

const createDataSource = (name: string): DataSource => ({
  name,
  type: 's3',
  description: '',
  settings: {},
});

const createDataSet = ({
  name,
  dataSource,
}: {
  name: string;
  dataSource: string;
}): DataSetWithName => ({
  name,
  data_source: dataSource,
  resource: 'bucket/*',
  description: '',
});

const createServicesMock = ({
  datasetsClient,
}: {
  datasetsClient: MockDatasetsClient;
}): DataFederationKibanaServices =>
  ({
    dataSourcesClient: { get: jest.fn() },
    datasetsClient,
    toasts: { addDanger: jest.fn(), addSuccess: jest.fn() },
  } as unknown as DataFederationKibanaServices);

const renderComponent = async ({
  dataSources,
  dataSets,
  datasetsClient,
  loadDataSets,
}: {
  dataSources: DataSource[];
  dataSets: DataSetWithName[];
  datasetsClient: MockDatasetsClient;
  loadDataSets: () => Promise<void>;
}) => {
  return render(
    <EuiProvider>
      <KibanaContextProvider services={createServicesMock({ datasetsClient })}>
        <DatasetsTabContent
          dataSources={dataSources}
          dataSets={dataSets}
          loadDataSets={loadDataSets}
        />
      </KibanaContextProvider>
    </EuiProvider>
  );
};

describe('DatasetsTabContent', () => {
  it('disables create when there are no data sources', async () => {
    await renderComponent({
      dataSources: [],
      dataSets: [],
      datasetsClient: { add: jest.fn(), delete: jest.fn() },
      loadDataSets: jest.fn().mockResolvedValue(undefined),
    });

    expect(document.querySelector('[data-test-subj="mockCreateDisabled"]')?.textContent).toBe(
      'true'
    );
  });

  it('reloads after flyout save', async () => {
    const loadDataSets = jest.fn().mockResolvedValue(undefined);
    const addMock = jest.fn().mockResolvedValue(undefined);

    await renderComponent({
      dataSources: [createDataSource('ds1')],
      dataSets: [],
      datasetsClient: { add: addMock, delete: jest.fn() },
      loadDataSets,
    });

    fireEvent.click(document.querySelector('[data-test-subj="mockCreate"]') as Element);
    expect(document.querySelector('[data-test-subj="mockCreateDatasetFlyout"]')).not.toBeNull();

    fireEvent.click(document.querySelector('[data-test-subj="mockFlyoutSave"]') as Element);

    await waitFor(() => {
      expect(addMock).toHaveBeenCalledTimes(1);
      expect(loadDataSets).toHaveBeenCalledTimes(1);
    });
  });

  it('on rename, saves new then deletes previous id and reloads', async () => {
    const loadDataSets = jest.fn().mockResolvedValue(undefined);
    const addMock = jest.fn().mockResolvedValue(undefined);
    const deleteMock = jest.fn().mockResolvedValue(undefined);

    await renderComponent({
      dataSources: [createDataSource('ds1')],
      dataSets: [],
      datasetsClient: { add: addMock, delete: deleteMock },
      loadDataSets,
    });

    fireEvent.click(document.querySelector('[data-test-subj="mockCreate"]') as Element);
    fireEvent.click(document.querySelector('[data-test-subj="mockFlyoutSaveRename"]') as Element);

    await waitFor(() => {
      expect(addMock).toHaveBeenCalledTimes(1);
      expect(deleteMock).toHaveBeenCalledWith('previous-dataset');
      expect(loadDataSets).toHaveBeenCalledTimes(1);
    });
  });

  it('confirms single delete via client and reloads', async () => {
    const loadDataSets = jest.fn().mockResolvedValue(undefined);
    const deleteMock = jest.fn().mockResolvedValue(undefined);

    await renderComponent({
      dataSources: [createDataSource('ds1')],
      dataSets: [createDataSet({ name: 'set1', dataSource: 'ds1' })],
      datasetsClient: { add: jest.fn(), delete: deleteMock },
      loadDataSets,
    });

    fireEvent.click(document.querySelector('[data-test-subj="mockDeleteFirst"]') as Element);
    expect(
      document.querySelector('[data-test-subj="mockConfirmDeleteDataSetModal"]')
    ).not.toBeNull();

    fireEvent.click(document.querySelector('[data-test-subj="mockConfirmDelete"]') as Element);

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('set1');
      expect(loadDataSets).toHaveBeenCalledTimes(1);
    });
  });

  it('resets selected items when data source filter changes', async () => {
    const loadDataSets = jest.fn().mockResolvedValue(undefined);

    await renderComponent({
      dataSources: [createDataSource('ds1')],
      dataSets: [createDataSet({ name: 'set1', dataSource: 'ds1' })],
      datasetsClient: { add: jest.fn(), delete: jest.fn() },
      loadDataSets,
    });

    fireEvent.click(document.querySelector('[data-test-subj="mockSelectFirst"]') as Element);
    await waitFor(() => {
      expect(document.querySelector('[data-test-subj="mockSelectedCount"]')?.textContent).toBe('1');
    });

    fireEvent.click(document.querySelector('[data-test-subj="mockChangeFilterToDs1"]') as Element);

    await waitFor(() => {
      expect(document.querySelector('[data-test-subj="mockSelectedCount"]')?.textContent).toBe('0');
    });
  });

  it('clears an invalid data source filter when the data source no longer exists', async () => {
    const loadDataSets = jest.fn().mockResolvedValue(undefined);

    const { rerender } = await renderComponent({
      dataSources: [createDataSource('ds1'), createDataSource('missing')],
      dataSets: [],
      datasetsClient: { add: jest.fn(), delete: jest.fn() },
      loadDataSets,
    });

    fireEvent.click(
      document.querySelector('[data-test-subj="mockChangeFilterToMissing"]') as Element
    );
    await waitFor(() => {
      expect(document.querySelector('[data-test-subj="mockFilterValue"]')?.textContent).toBe(
        'missing'
      );
    });

    rerender(
      <EuiProvider>
        <KibanaContextProvider
          services={createServicesMock({ datasetsClient: { add: jest.fn(), delete: jest.fn() } })}
        >
          <DatasetsTabContent
            dataSources={[createDataSource('ds1')]}
            dataSets={[]}
            loadDataSets={loadDataSets}
          />
        </KibanaContextProvider>
      </EuiProvider>
    );

    await waitFor(() => {
      expect(document.querySelector('[data-test-subj="mockFilterValue"]')?.textContent).toBe('');
    });
  });
});
