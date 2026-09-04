/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataSetWithName, DataSource } from '../common';
import { MOCK_CONNECTION_CHECK_DELAY_MS } from './data_source_connection_status';
import { mainTranslations } from './main_i18n';
import { DataSourcesTabContent } from './data_sources_tab_content';
import type { DataFederationKibanaServices } from './types';

type MockDataSourcesClient = Pick<DataFederationKibanaServices['dataSourcesClient'], 'delete'> &
  Partial<Pick<DataFederationKibanaServices['dataSourcesClient'], 'add'>>;

jest.mock('./data_sources_table', () => ({
  DataSourcesTable: (props: Record<string, unknown>) => {
    const dataSources = (props.dataSources as any[]) ?? [];
    const selectedDataSources = (props.selectedDataSources as any[]) ?? [];
    const checkingDataSourceNames = (props.checkingDataSourceNames as Set<string>) ?? new Set();
    const connectionStatuses = (props.connectionStatuses as Map<string, string>) ?? new Map();

    return (
      <div data-test-subj="mockDataSourcesTable">
        <div data-test-subj="mockChecking">{[...checkingDataSourceNames].join(',')}</div>
        <div data-test-subj="mockStatuses">
          {[...connectionStatuses].map(([name, status]) => `${name}:${status}`).join(',')}
        </div>
        <button data-test-subj="mockCreate" onClick={() => (props.onCreate as any)()} />
        <button
          data-test-subj="mockDeleteFirst"
          onClick={() => (props.onDelete as any)(dataSources[0])}
        />
        <button
          data-test-subj="mockSelectFirst"
          onClick={() => (props.onSelectionChange as any)([dataSources[0]])}
        />
        <button
          data-test-subj="mockDeleteSelected"
          onClick={() => (props.onDeleteSelected as any)(selectedDataSources)}
        />
        <button
          data-test-subj="mockDeleteAll"
          onClick={() => (props.onDeleteSelected as any)(dataSources)}
        />
        <div data-test-subj="mockSelectedCount">{String(selectedDataSources.length)}</div>
      </div>
    );
  },
}));

jest.mock('./create_data_source_flyout', () => ({
  CreateDataSourceFlyout: (props: {
    onClose: (result?: { savedChanges?: boolean }) => void;
    onSave: (dataSource: unknown) => Promise<string | null>;
  }) => (
    <div data-test-subj="mockCreateDataSourceFlyout">
      <button
        data-test-subj="mockFlyoutCloseSaved"
        onClick={() => props.onClose({ savedChanges: true })}
      />
      <button data-test-subj="mockFlyoutClose" onClick={() => props.onClose()} />
      <button
        data-test-subj="mockFlyoutSave"
        onClick={() => {
          void props.onSave({ name: 'ds1', type: 's3', description: '', settings: {} });
        }}
      />
    </div>
  ),
}));

jest.mock('./confirm_delete_data_source_modal', () => ({
  ConfirmDeleteDataSourceModal: (props: {
    dataSourceName: string;
    error?: string | null;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div data-test-subj="mockConfirmDeleteDataSourceModal">
      <div data-test-subj="mockDeleteName">{props.dataSourceName}</div>
      {props.error ? <div data-test-subj="mockDeleteError">{props.error}</div> : null}
      <button data-test-subj="mockConfirmDelete" onClick={props.onConfirm} />
      <button data-test-subj="mockCancelDelete" onClick={props.onCancel} />
    </div>
  ),
}));

jest.mock('./confirm_delete_data_sources_modal', () => ({
  ConfirmDeleteDataSourcesModal: (props: {
    dataSourceNames: string[];
    error?: string | null;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div data-test-subj="mockConfirmDeleteDataSourcesModal">
      <div data-test-subj="mockDeleteNames">{props.dataSourceNames.join(',')}</div>
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

const createDataSet = (dataSourceName: string): DataSetWithName => ({
  name: 'my-dataset',
  data_source: dataSourceName,
  resource: 'bucket/*',
});

const createToastsMock = () => ({ addDanger: jest.fn(), addSuccess: jest.fn() });

const createServicesMock = ({
  dataSourcesClient,
  toasts,
}: {
  dataSourcesClient: MockDataSourcesClient;
  toasts: ReturnType<typeof createToastsMock>;
}): DataFederationKibanaServices =>
  ({
    dataSourcesClient,
    datasetsClient: { get: jest.fn() },
    toasts,
  } as unknown as DataFederationKibanaServices);

const renderComponent = async ({
  dataSources,
  dataSets,
  dataSourcesClient,
  loadDataSources,
  toasts = createToastsMock(),
}: {
  dataSources: DataSource[];
  dataSets: DataSetWithName[];
  dataSourcesClient: MockDataSourcesClient;
  loadDataSources: () => Promise<void>;
  toasts?: ReturnType<typeof createToastsMock>;
}) => {
  return render(
    <EuiProvider>
      <KibanaContextProvider services={createServicesMock({ dataSourcesClient, toasts })}>
        <DataSourcesTabContent
          dataSources={dataSources}
          dataSets={dataSets}
          loadDataSources={loadDataSources}
          onViewDataSetsForDataSource={jest.fn()}
        />
      </KibanaContextProvider>
    </EuiProvider>
  );
};

describe('DataSourcesTabContent', () => {
  it('opens the flyout and reloads on save', async () => {
    const loadDataSources = jest.fn().mockResolvedValue(undefined);
    await renderComponent({
      dataSources: [createDataSource('ds1')],
      dataSets: [],
      dataSourcesClient: { delete: jest.fn() },
      loadDataSources,
    });

    fireEvent.click(document.querySelector('[data-test-subj="mockCreate"]') as Element);
    expect(document.querySelector('[data-test-subj="mockCreateDataSourceFlyout"]')).not.toBeNull();

    fireEvent.click(document.querySelector('[data-test-subj="mockFlyoutCloseSaved"]') as Element);

    await waitFor(() => {
      expect(loadDataSources).toHaveBeenCalledTimes(1);
    });
  });

  describe('connection check after saving', () => {
    const saveAndStartCheck = async () => {
      const toasts = createToastsMock();
      const addMock = jest.fn().mockResolvedValue(undefined);
      const { getByTestId, queryByTestId } = await renderComponent({
        dataSources: [createDataSource('ds1')],
        dataSets: [],
        dataSourcesClient: { delete: jest.fn(), add: addMock },
        loadDataSources: jest.fn().mockResolvedValue(undefined),
        toasts,
      });

      fireEvent.click(getByTestId('mockCreate'));
      await act(async () => {
        fireEvent.click(getByTestId('mockFlyoutSave'));
      });

      expect(addMock).toHaveBeenCalledTimes(1);
      // The flyout closes and the row reports the check as in flight.
      expect(queryByTestId('mockCreateDataSourceFlyout')).toBeNull();
      expect(getByTestId('mockChecking')).toHaveTextContent('ds1');
      expect(getByTestId('mockStatuses')).toBeEmptyDOMElement();

      return { getByTestId, toasts };
    };

    const finishCheck = async () => {
      await act(async () => {
        jest.advanceTimersByTime(MOCK_CONNECTION_CHECK_DELAY_MS);
      });
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('reports a successful check in the status column and a toast', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1);

      const { getByTestId, toasts } = await saveAndStartCheck();
      await finishCheck();

      expect(getByTestId('mockChecking')).toBeEmptyDOMElement();
      expect(getByTestId('mockStatuses')).toHaveTextContent('ds1:connected');
      expect(toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Connection successful',
        text: mainTranslations.connectionCheck.successText('ds1'),
      });
      expect(toasts.addDanger).not.toHaveBeenCalled();
    });

    it('reports a failed check in the status column and a toast', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const { getByTestId, toasts } = await saveAndStartCheck();
      await finishCheck();

      expect(getByTestId('mockChecking')).toBeEmptyDOMElement();
      expect(getByTestId('mockStatuses')).toHaveTextContent('ds1:broken');
      expect(toasts.addDanger).toHaveBeenCalledWith({
        title: 'Connection failed',
        text: mainTranslations.connectionCheck.errorText('ds1'),
      });
      expect(toasts.addSuccess).not.toHaveBeenCalled();
    });
  });

  it('confirms single delete via client and reloads', async () => {
    const loadDataSources = jest.fn().mockResolvedValue(undefined);
    const deleteMock = jest.fn().mockResolvedValue(undefined);

    await renderComponent({
      dataSources: [createDataSource('ds1')],
      dataSets: [],
      dataSourcesClient: { delete: deleteMock },
      loadDataSources,
    });

    fireEvent.click(document.querySelector('[data-test-subj="mockDeleteFirst"]') as Element);
    expect(
      document.querySelector('[data-test-subj="mockConfirmDeleteDataSourceModal"]')
    ).not.toBeNull();

    fireEvent.click(document.querySelector('[data-test-subj="mockConfirmDelete"]') as Element);

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('ds1');
      expect(loadDataSources).toHaveBeenCalledTimes(1);
    });
  });

  it('bulk delete refuses when any data source has related datasets', async () => {
    const loadDataSources = jest.fn().mockResolvedValue(undefined);
    const deleteMock = jest.fn().mockResolvedValue(undefined);

    await renderComponent({
      dataSources: [createDataSource('connected')],
      dataSets: [createDataSet('connected')],
      dataSourcesClient: { delete: deleteMock },
      loadDataSources,
    });

    // Bypass UI selection filtering by directly passing "all" to onDeleteSelected.
    fireEvent.click(document.querySelector('[data-test-subj="mockDeleteAll"]') as Element);
    expect(
      document.querySelector('[data-test-subj="mockConfirmDeleteDataSourcesModal"]')
    ).not.toBeNull();

    fireEvent.click(document.querySelector('[data-test-subj="mockConfirmDeleteMany"]') as Element);

    await waitFor(() => {
      expect(deleteMock).not.toHaveBeenCalled();
      expect(document.querySelector('[data-test-subj="mockDeleteManyError"]')?.textContent).toBe(
        mainTranslations.confirmDeleteDataSources.hasRelatedDataSetsError
      );
    });
  });
});
