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
import { mainTranslations } from './main_i18n';
import type { DataFederationKibanaServices } from './types';
import { UI_COUNTER_EVENTS } from './ui_counters';

type MockDatasetsClient = Pick<DataFederationKibanaServices['datasetsClient'], 'add' | 'delete'>;

jest.mock('./datasets_table', () => ({
  DatasetsTable: (props: Record<string, unknown>) => {
    const items = (props.items as any[]) ?? [];
    const selectedItems = (props.selectedItems as any[]) ?? [];

    return (
      <div data-test-subj="mockDatasetsTable">
        <div data-test-subj="mockSelectedCount">{String(selectedItems.length)}</div>
        <button
          data-test-subj="mockSelectFirst"
          onClick={() => (props.onSelectionChange as any)([items[0]])}
        />
        <button
          data-test-subj="mockDeleteFirst"
          onClick={() => (props.onDelete as any)(items[0])}
        />
        <button
          data-test-subj="mockDeleteSelected"
          onClick={() => (props.onDeleteSelected as any)(selectedItems)}
        />
        <button
          data-test-subj="mockDeleteAll"
          onClick={() => (props.onDeleteSelected as any)(items)}
        />
      </div>
    );
  },
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
  addDanger = jest.fn(),
  reportUiCounter,
}: {
  datasetsClient: MockDatasetsClient;
  addDanger?: jest.Mock;
  reportUiCounter?: jest.Mock;
}): DataFederationKibanaServices =>
  ({
    dataSourcesClient: { get: jest.fn() },
    datasetsClient,
    toasts: { addDanger, addSuccess: jest.fn() },
    reportUiCounter,
    docLinks: {
      links: {
        dataFederation: {
          overview: '',
          quickstart: '',
          dataSources: '',
          datasets: '',
          datasetSettings: '',
          datasetMappings: '',
          authentication: '',
          staticCredentials: '',
          federatedIdentity: '',
          querying: '',
          security: '',
        },
      },
    },
  } as unknown as DataFederationKibanaServices);

const renderComponent = async ({
  dataSources,
  dataSets,
  datasetsClient,
  loadDataSets,
  addDanger,
  reportUiCounter,
}: {
  dataSources: DataSource[];
  dataSets: DataSetWithName[];
  datasetsClient: MockDatasetsClient;
  loadDataSets: () => Promise<void>;
  addDanger?: jest.Mock;
  reportUiCounter?: jest.Mock;
}) => {
  return render(
    <EuiProvider>
      <KibanaContextProvider
        services={createServicesMock({ datasetsClient, addDanger, reportUiCounter })}
      >
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

  it('reports a refresh failure after a successful delete in a toast', async () => {
    const loadDataSets = jest.fn().mockRejectedValue(new Error('list unavailable'));
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const addDanger = jest.fn();

    await renderComponent({
      dataSources: [createDataSource('ds1')],
      dataSets: [createDataSet({ name: 'set1', dataSource: 'ds1' })],
      datasetsClient: { add: jest.fn(), delete: deleteMock },
      loadDataSets,
      addDanger,
    });

    fireEvent.click(document.querySelector('[data-test-subj="mockDeleteFirst"]') as Element);
    fireEvent.click(document.querySelector('[data-test-subj="mockConfirmDelete"]') as Element);

    await waitFor(() => {
      expect(addDanger).toHaveBeenCalledWith({
        title: mainTranslations.refreshDataSetsErrorTitle,
        text: 'list unavailable',
      });
    });
    expect(deleteMock).toHaveBeenCalledWith('set1');
    expect(document.querySelector('[data-test-subj="mockDeleteError"]')).toBeNull();
  });

  describe('ui counters', () => {
    it('reports dataset_delete after a successful single delete', async () => {
      const reportUiCounter = jest.fn();
      await renderComponent({
        dataSources: [createDataSource('ds1')],
        dataSets: [createDataSet({ name: 'set1', dataSource: 'ds1' })],
        datasetsClient: { add: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) },
        loadDataSets: jest.fn().mockResolvedValue(undefined),
        reportUiCounter,
      });

      fireEvent.click(document.querySelector('[data-test-subj="mockDeleteFirst"]') as Element);
      fireEvent.click(document.querySelector('[data-test-subj="mockConfirmDelete"]') as Element);

      await waitFor(() => {
        expect(reportUiCounter).toHaveBeenCalledWith(UI_COUNTER_EVENTS.datasetDelete);
      });
    });

    it('reports dataset_delete with the number of deleted datasets on bulk delete', async () => {
      const reportUiCounter = jest.fn();
      await renderComponent({
        dataSources: [createDataSource('ds1')],
        dataSets: [
          createDataSet({ name: 'set1', dataSource: 'ds1' }),
          createDataSet({ name: 'set2', dataSource: 'ds1' }),
        ],
        datasetsClient: { add: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) },
        loadDataSets: jest.fn().mockResolvedValue(undefined),
        reportUiCounter,
      });

      fireEvent.click(document.querySelector('[data-test-subj="mockDeleteAll"]') as Element);
      fireEvent.click(
        document.querySelector('[data-test-subj="mockConfirmDeleteMany"]') as Element
      );

      await waitFor(() => {
        expect(reportUiCounter).toHaveBeenCalledWith(UI_COUNTER_EVENTS.datasetDelete, 2);
      });
    });

    it('does not report when the delete fails', async () => {
      const reportUiCounter = jest.fn();
      await renderComponent({
        dataSources: [createDataSource('ds1')],
        dataSets: [createDataSet({ name: 'set1', dataSource: 'ds1' })],
        datasetsClient: { add: jest.fn(), delete: jest.fn().mockRejectedValue(new Error('nope')) },
        loadDataSets: jest.fn().mockResolvedValue(undefined),
        reportUiCounter,
      });

      fireEvent.click(document.querySelector('[data-test-subj="mockDeleteFirst"]') as Element);
      fireEvent.click(document.querySelector('[data-test-subj="mockConfirmDelete"]') as Element);

      await waitFor(() => {
        expect(document.querySelector('[data-test-subj="mockDeleteError"]')).not.toBeNull();
      });
      expect(reportUiCounter).not.toHaveBeenCalled();
    });
  });
});
