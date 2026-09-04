/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataSetWithName, DataSourceWithSecrets, DataSource } from '../common';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout/create_data_source_flyout_i18n';
import { dataSourceFromListItem } from './create_data_source_flyout/data_source_flyout_initial_values';
import {
  runMockDataSourceConnectionCheck,
  type DataSourceConnectionStatus,
} from './data_source_connection_status';
import { ConfirmDeleteDataSourceModal } from './confirm_delete_data_source_modal';
import { ConfirmDeleteDataSourcesModal } from './confirm_delete_data_sources_modal';
import { DataSourcesTable } from './data_sources_table';
import {
  extractFlyoutSaveErrorMessage,
  formatFlyoutSaveError,
} from './get_flyout_save_error_message';
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
  onViewDataSetsForDataSource: (dataSourceName: string) => void;
  disabledDataSourceNames?: ReadonlySet<string>;
  onDataSourceEnabledChange?: (name: string, enabled: boolean) => void;
}

export const DataSourcesTabContent: FunctionComponent<DataSourcesTabContentProps> = ({
  dataSources,
  dataSets,
  loadDataSources,
  onViewDataSetsForDataSource,
  disabledDataSourceNames,
  onDataSourceEnabledChange,
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
  const [connectionStatuses, setConnectionStatuses] = useState<
    ReadonlyMap<string, DataSourceConnectionStatus>
  >(new Map());
  const [checkingDataSourceNames, setCheckingDataSourceNames] = useState<ReadonlySet<string>>(
    new Set()
  );
  /**
   * Identifies the check a result belongs to, so a re-save that restarts a check discards
   * the result of the check it replaced, and so nothing lands after unmount.
   */
  const latestConnectionCheckIdRef = useRef(new Map<string, number>());
  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

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
      const formatted = formatFlyoutSaveError(extractFlyoutSaveErrorMessage(e));
      setDeleteDataSourceError(formatted.toastText);
      toasts.addDanger({
        title: mainTranslations.confirmDeleteDataSource.errorTitle,
        text: formatted.toastText,
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
      const formatted = formatFlyoutSaveError(extractFlyoutSaveErrorMessage(e));
      setDeleteDataSourcesError(formatted.toastText);
      toasts.addDanger({
        title: mainTranslations.confirmDeleteDataSources.errorTitle,
        text: formatted.toastText,
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

  const startConnectionCheck = useCallback(
    async (name: string) => {
      const checkId = (latestConnectionCheckIdRef.current.get(name) ?? 0) + 1;
      latestConnectionCheckIdRef.current.set(name, checkId);

      setCheckingDataSourceNames((current) => new Set(current).add(name));

      const status = await runMockDataSourceConnectionCheck();

      // A newer check for this data source, or an unmount, makes this result stale.
      if (!isMountedRef.current || latestConnectionCheckIdRef.current.get(name) !== checkId) {
        return;
      }

      setConnectionStatuses((current) => new Map(current).set(name, status));
      setCheckingDataSourceNames((current) => {
        const next = new Set(current);
        next.delete(name);
        return next;
      });

      if (status === 'connected') {
        toasts.addSuccess({
          title: createDataSourceFlyoutStrings.testConnectionSuccessTitle(),
          text: mainTranslations.connectionCheck.successText(name),
        });
        return;
      }

      toasts.addDanger({
        title: createDataSourceFlyoutStrings.testConnectionErrorTitle(),
        text: mainTranslations.connectionCheck.errorText(name),
      });
    },
    [toasts]
  );

  const onSave = useCallback(
    async (dataSource: DataSourceWithSecrets): Promise<string | null> => {
      try {
        if (flyout.mode === 'edit') {
          await dataSourcesClient.update(dataSource);
        } else {
          await dataSourcesClient.add(dataSource);
        }

        onClose({ savedChanges: true });
        // Keyed by the name we just saved, which is how the reloaded row identifies itself.
        void startConnectionCheck(dataSource.name);
        return null;
      } catch (e) {
        return extractFlyoutSaveErrorMessage(e);
      }
    },
    [dataSourcesClient, flyout.mode, onClose, startConnectionCheck]
  );

  return (
    <>
      <DataSourcesTable
        dataSources={dataSources}
        selectedDataSources={selectedDataSources}
        onSelectionChange={setSelectedDataSources}
        dataSetsCountByDataSource={dataSetsCountByDataSource}
        connectionStatuses={connectionStatuses}
        checkingDataSourceNames={checkingDataSourceNames}
        onCreate={() => setFlyout({ mode: 'create' })}
        onEdit={(item: DataSource) =>
          setFlyout({
            mode: 'edit',
            dataSource: dataSourceFromListItem(item),
          })
        }
        onDelete={handleDeleteDataSource}
        onDeleteSelected={handleDeleteSelectedDataSources}
        onViewDataSetsForDataSource={onViewDataSetsForDataSource}
        disabledDataSourceNames={disabledDataSourceNames}
        onDataSourceEnabledChange={onDataSourceEnabledChange}
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
