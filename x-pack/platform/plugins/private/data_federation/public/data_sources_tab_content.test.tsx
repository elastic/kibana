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
import { mainTranslations } from './main_i18n';
import { DataSourcesTabContent } from './data_sources_tab_content';
import type { DataFederationKibanaServices } from './types';

type MockDataSourcesClient = Pick<DataFederationKibanaServices['dataSourcesClient'], 'delete'>;

jest.mock('./data_sources_table', () => ({
  DataSourcesTable: (props: Record<string, unknown>) => {
    const dataSources = (props.dataSources as any[]) ?? [];
    const selectedDataSources = (props.selectedDataSources as any[]) ?? [];

    return (
      <div data-test-subj="mockDataSourcesTable">
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
  CreateDataSourceFlyout: (props: { onClose: (result?: { savedChanges?: boolean }) => void }) => (
    <div data-test-subj="mockCreateDataSourceFlyout">
      <button
        data-test-subj="mockFlyoutCloseSaved"
        onClick={() => props.onClose({ savedChanges: true })}
      />
      <button data-test-subj="mockFlyoutClose" onClick={() => props.onClose()} />
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

const createServicesMock = ({
  dataSourcesClient,
}: {
  dataSourcesClient: MockDataSourcesClient;
}): DataFederationKibanaServices =>
  ({
    dataSourcesClient,
    datasetsClient: { get: jest.fn() },
    toasts: { addDanger: jest.fn(), addSuccess: jest.fn() },
  } as unknown as DataFederationKibanaServices);

const renderComponent = async ({
  dataSources,
  dataSets,
  dataSourcesClient,
  loadDataSources,
}: {
  dataSources: DataSource[];
  dataSets: DataSetWithName[];
  dataSourcesClient: MockDataSourcesClient;
  loadDataSources: () => Promise<void>;
}) => {
  return render(
    <EuiProvider>
      <KibanaContextProvider services={createServicesMock({ dataSourcesClient })}>
        <DataSourcesTabContent
          dataSources={dataSources}
          dataSets={dataSets}
          loadDataSources={loadDataSources}
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
