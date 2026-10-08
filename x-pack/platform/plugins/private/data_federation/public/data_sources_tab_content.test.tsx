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
import { UI_COUNTER_EVENTS } from './ui_counters';

type MockDataSourcesClient = Partial<
  Pick<DataFederationKibanaServices['dataSourcesClient'], 'add' | 'update' | 'delete'>
>;

jest.mock('./data_sources_table', () => ({
  DataSourcesTable: (props: Record<string, unknown>) => {
    const dataSources = (props.dataSources as any[]) ?? [];
    const selectedDataSources = (props.selectedDataSources as any[]) ?? [];

    return (
      <div data-test-subj="mockDataSourcesTable">
        <button data-test-subj="mockCreate" onClick={() => (props.onCreate as any)()} />
        <button
          data-test-subj="mockEditFirst"
          onClick={() => (props.onEdit as any)(dataSources[0])}
        />
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
        data-test-subj="mockFlyoutSave"
        onClick={() =>
          void props.onSave({ name: 'ds-new', type: 's3', description: '', settings: {} })
        }
      />
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
  reportUiCounter,
}: {
  dataSourcesClient: MockDataSourcesClient;
  reportUiCounter?: jest.Mock;
}): DataFederationKibanaServices =>
  ({
    dataSourcesClient,
    datasetsClient: { get: jest.fn() },
    toasts: { addDanger: jest.fn(), addSuccess: jest.fn() },
    reportUiCounter,
    docLinks: {
      links: {
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
    },
  } as unknown as DataFederationKibanaServices);

const renderComponent = async ({
  dataSources,
  dataSets,
  dataSourcesClient,
  loadDataSources,
  reportUiCounter,
}: {
  dataSources: DataSource[];
  dataSets: DataSetWithName[];
  dataSourcesClient: MockDataSourcesClient;
  loadDataSources: () => Promise<void>;
  reportUiCounter?: jest.Mock;
}) => {
  return render(
    <EuiProvider>
      <KibanaContextProvider services={createServicesMock({ dataSourcesClient, reportUiCounter })}>
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

  describe('ui counters', () => {
    it('reports datasource_create after a successful create', async () => {
      const reportUiCounter = jest.fn();
      const add = jest.fn().mockResolvedValue(undefined);
      await renderComponent({
        dataSources: [createDataSource('ds1')],
        dataSets: [],
        dataSourcesClient: { add },
        loadDataSources: jest.fn().mockResolvedValue(undefined),
        reportUiCounter,
      });

      fireEvent.click(document.querySelector('[data-test-subj="mockCreate"]') as Element);
      fireEvent.click(document.querySelector('[data-test-subj="mockFlyoutSave"]') as Element);

      await waitFor(() => {
        expect(reportUiCounter).toHaveBeenCalledWith(['datasource_create', 'datasource_create_s3']);
      });
      expect(reportUiCounter).toHaveBeenCalledTimes(1);
    });

    it('reports datasource_update after a successful edit', async () => {
      const reportUiCounter = jest.fn();
      const update = jest.fn().mockResolvedValue(undefined);
      await renderComponent({
        dataSources: [createDataSource('ds1')],
        dataSets: [],
        dataSourcesClient: { update },
        loadDataSources: jest.fn().mockResolvedValue(undefined),
        reportUiCounter,
      });

      fireEvent.click(document.querySelector('[data-test-subj="mockEditFirst"]') as Element);
      fireEvent.click(document.querySelector('[data-test-subj="mockFlyoutSave"]') as Element);

      await waitFor(() => {
        expect(reportUiCounter).toHaveBeenCalledWith(UI_COUNTER_EVENTS.datasourceUpdate);
      });
      expect(reportUiCounter).toHaveBeenCalledTimes(1);
    });

    it('does not report when the save fails', async () => {
      const reportUiCounter = jest.fn();
      const add = jest.fn().mockRejectedValue(new Error('nope'));
      await renderComponent({
        dataSources: [createDataSource('ds1')],
        dataSets: [],
        dataSourcesClient: { add },
        loadDataSources: jest.fn().mockResolvedValue(undefined),
        reportUiCounter,
      });

      fireEvent.click(document.querySelector('[data-test-subj="mockCreate"]') as Element);
      fireEvent.click(document.querySelector('[data-test-subj="mockFlyoutSave"]') as Element);

      await waitFor(() => {
        expect(add).toHaveBeenCalled();
      });
      expect(reportUiCounter).not.toHaveBeenCalled();
    });

    it('reports datasource_delete after a successful single delete', async () => {
      const reportUiCounter = jest.fn();
      await renderComponent({
        dataSources: [createDataSource('ds1')],
        dataSets: [],
        dataSourcesClient: { delete: jest.fn().mockResolvedValue(undefined) },
        loadDataSources: jest.fn().mockResolvedValue(undefined),
        reportUiCounter,
      });

      fireEvent.click(document.querySelector('[data-test-subj="mockDeleteFirst"]') as Element);
      fireEvent.click(document.querySelector('[data-test-subj="mockConfirmDelete"]') as Element);

      await waitFor(() => {
        expect(reportUiCounter).toHaveBeenCalledWith(UI_COUNTER_EVENTS.datasourceDelete);
      });
    });

    it('reports datasource_delete with the number of deleted data sources on bulk delete', async () => {
      const reportUiCounter = jest.fn();
      await renderComponent({
        dataSources: [createDataSource('ds1'), createDataSource('ds2')],
        dataSets: [],
        dataSourcesClient: { delete: jest.fn().mockResolvedValue(undefined) },
        loadDataSources: jest.fn().mockResolvedValue(undefined),
        reportUiCounter,
      });

      fireEvent.click(document.querySelector('[data-test-subj="mockDeleteAll"]') as Element);
      fireEvent.click(
        document.querySelector('[data-test-subj="mockConfirmDeleteMany"]') as Element
      );

      await waitFor(() => {
        expect(reportUiCounter).toHaveBeenCalledWith(UI_COUNTER_EVENTS.datasourceDelete, 2);
      });
    });

    it('does not report when the delete fails', async () => {
      const reportUiCounter = jest.fn();
      const deleteMock = jest.fn().mockRejectedValue(new Error('nope'));
      await renderComponent({
        dataSources: [createDataSource('ds1')],
        dataSets: [],
        dataSourcesClient: { delete: deleteMock },
        loadDataSources: jest.fn().mockResolvedValue(undefined),
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
