/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataSetWithName, DataSourceWithSecrets, DataSource } from '../common';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { dataSourceFromListItem } from './create_data_source_flyout/data_source_flyout_initial_values';
import { ConfirmDeleteDataSourceModal } from './confirm_delete_data_source_modal';
import { ConfirmDeleteDataSourcesModal } from './confirm_delete_data_sources_modal';
import { DataSourcesTable } from './data_sources_table';
import { getFlyoutSaveErrorMessage } from './get_flyout_save_error_message';
import { mainTranslations } from './main_i18n';
import type { DataFederationKibanaServices } from './types';

type DataSourceFlyoutState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; dataSource: DataSourceWithSecrets };

export interface DataSourcesTabContentProps {
  dataSources: DataSource[];
  dataSets: DataSetWithName[];
  loadDataSources: () => Promise<void>;
}

export const DataSourcesTabContent: FunctionComponent<DataSourcesTabContentProps> = ({
  dataSources,
  dataSets,
  loadDataSources,
}) => {
  const [flyout, setFlyout] = useState<DataSourceFlyoutState>({ mode: 'closed' });
  const [pendingDeleteDataSource, setPendingDeleteDataSource] = useState<DataSource | null>(null);
  const [isDeletingDataSource, setIsDeletingDataSource] = useState(false);
  const [deleteDataSourceError, setDeleteDataSourceError] = useState<string | null>(null);
  const [pendingDeleteDataSources, setPendingDeleteDataSources] = useState<
    readonly DataSource[] | null
  >(null);
  const [isDeletingDataSources, setIsDeletingDataSources] = useState(false);
  const [deleteDataSourcesError, setDeleteDataSourcesError] = useState<string | null>(null);
  const {
    services: { dataSourcesClient, toasts },
  } = useKibana<DataFederationKibanaServices>();
  const [selectedDataSources, setSelectedDataSources] = useState<DataSource[]>([]);

  const existingDataSourceNames = useMemo(() => dataSources.map((ds) => ds.name), [dataSources]);

  const dataSetsCountByDataSource = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ds of dataSets) {
      counts.set(ds.data_source, (counts.get(ds.data_source) ?? 0) + 1);
    }
    return counts;
  }, [dataSets]);

  useEffect(() => {
    const filteredSelection = selectedDataSources.filter(
      (item) => (dataSetsCountByDataSource.get(item.name) ?? 0) === 0
    );
    if (filteredSelection.length === selectedDataSources.length) {
      return;
    }
    setSelectedDataSources(filteredSelection);
  }, [dataSetsCountByDataSource, selectedDataSources]);

  const onClose = useCallback(
    (result?: { savedChanges?: boolean }) => {
      setFlyout({ mode: 'closed' });
      if (result?.savedChanges) {
        void loadDataSources();
      }
    },
    [loadDataSources]
  );

  const handleDeleteDataSource = useCallback((item: DataSource) => {
    setPendingDeleteDataSource(item);
    setDeleteDataSourceError(null);
  }, []);

  const handleDeleteSelectedDataSources = useCallback((nextItems: readonly DataSource[]) => {
    setPendingDeleteDataSources(nextItems);
    setDeleteDataSourcesError(null);
  }, []);

  const cancelDeleteDataSource = useCallback(() => {
    if (isDeletingDataSource) {
      return;
    }
    setPendingDeleteDataSource(null);
    setDeleteDataSourceError(null);
  }, [isDeletingDataSource]);

  const cancelDeleteDataSources = useCallback(() => {
    if (isDeletingDataSources) {
      return;
    }
    setPendingDeleteDataSources(null);
    setDeleteDataSourcesError(null);
  }, [isDeletingDataSources]);

  const confirmDeleteDataSource = useCallback(async () => {
    if (!pendingDeleteDataSource) {
      return;
    }
    setIsDeletingDataSource(true);
    setDeleteDataSourceError(null);
    try {
      await dataSourcesClient.delete(pendingDeleteDataSource.name);
      setSelectedDataSources([]);
      setPendingDeleteDataSource(null);
      void loadDataSources();
    } catch (e) {
      const message = getFlyoutSaveErrorMessage(e);
      setDeleteDataSourceError(message);
      toasts.addDanger({
        title: mainTranslations.confirmDeleteDataSource.errorTitle,
        text: message,
      });
    } finally {
      setIsDeletingDataSource(false);
    }
  }, [dataSourcesClient, loadDataSources, pendingDeleteDataSource, toasts]);

  const confirmDeleteDataSources = useCallback(async () => {
    if (!pendingDeleteDataSources || pendingDeleteDataSources.length === 0) {
      return;
    }

    const hasRelatedDataSets = pendingDeleteDataSources.some(
      (ds) => (dataSetsCountByDataSource.get(ds.name) ?? 0) > 0
    );
    if (hasRelatedDataSets) {
      setDeleteDataSourcesError(mainTranslations.confirmDeleteDataSources.hasRelatedDataSetsError);
      return;
    }

    setIsDeletingDataSources(true);
    setDeleteDataSourcesError(null);
    try {
      await dataSourcesClient.delete(pendingDeleteDataSources.map((ds) => ds.name));
      setSelectedDataSources([]);
      setPendingDeleteDataSources(null);
      void loadDataSources();
    } catch (e) {
      const message = getFlyoutSaveErrorMessage(e);
      setDeleteDataSourcesError(message);
      toasts.addDanger({
        title: mainTranslations.confirmDeleteDataSources.errorTitle,
        text: message,
      });
    } finally {
      setIsDeletingDataSources(false);
    }
  }, [
    dataSetsCountByDataSource,
    dataSourcesClient,
    loadDataSources,
    setSelectedDataSources,
    pendingDeleteDataSources,
    toasts,
  ]);

  const onSave = useCallback(
    async (dataSource: DataSourceWithSecrets): Promise<string | null> => {
      try {
        if (flyout.mode === 'edit') {
          await dataSourcesClient.update(dataSource);
        } else {
          await dataSourcesClient.add(dataSource);
        }

        onClose({ savedChanges: true });
        return null;
      } catch (e) {
        return getFlyoutSaveErrorMessage(e);
      }
    },
    [dataSourcesClient, flyout.mode, onClose]
  );

  return (
    <>
      <DataSourcesTable
        dataSources={dataSources}
        selectedDataSources={selectedDataSources}
        onSelectionChange={setSelectedDataSources}
        dataSetsCountByDataSource={dataSetsCountByDataSource}
        onCreate={() => setFlyout({ mode: 'create' })}
        onEdit={(item: DataSource) =>
          setFlyout({
            mode: 'edit',
            dataSource: dataSourceFromListItem(item),
          })
        }
        onDelete={handleDeleteDataSource}
        onDeleteSelected={handleDeleteSelectedDataSources}
      />
      {flyout.mode !== 'closed' ? (
        <CreateDataSourceFlyout
          initialDataSource={flyout.mode === 'edit' ? flyout.dataSource : undefined}
          existingDataSourceNames={existingDataSourceNames}
          onClose={onClose}
          onSave={onSave}
        />
      ) : null}
      {pendingDeleteDataSource ? (
        <ConfirmDeleteDataSourceModal
          dataSourceName={pendingDeleteDataSource.name}
          isDeleting={isDeletingDataSource}
          error={deleteDataSourceError}
          onConfirm={() => void confirmDeleteDataSource()}
          onCancel={cancelDeleteDataSource}
        />
      ) : null}
      {pendingDeleteDataSources ? (
        <ConfirmDeleteDataSourcesModal
          dataSourceNames={pendingDeleteDataSources.map((ds) => ds.name)}
          isDeleting={isDeletingDataSources}
          error={deleteDataSourcesError}
          onConfirm={() => void confirmDeleteDataSources()}
          onCancel={cancelDeleteDataSources}
        />
      ) : null}
    </>
  );
};
