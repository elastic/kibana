/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataSourceWithSecrets, DataSource } from '../common';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { dataSourceFromListItem } from './create_data_source_flyout/data_source_flyout_initial_values';
import { ConfirmDeleteDataSourceModal } from './confirm_delete_data_source_modal';
import { DataSourcesTable } from './data_sources_table';
import { getFlyoutSaveErrorMessage } from './get_flyout_save_error_message';
import { mainTranslations } from './main_i18n';
import type { DataFederationKibanaServices } from './types';

type DataSourceFlyoutState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; dataSource: DataSourceWithSecrets };

export type DataSourcesTabContentProps = Omit<
  Parameters<typeof DataSourcesTable>[0],
  'onCreate' | 'onEdit' | 'onDelete'
> & {
  onFlyoutClose: (result?: { savedChanges?: boolean }) => void;
};

export const DataSourcesTabContent: FunctionComponent<DataSourcesTabContentProps> = ({
  items,
  onFlyoutClose,
  ...tableProps
}) => {
  const [flyout, setFlyout] = useState<DataSourceFlyoutState>({ mode: 'closed' });
  const [pendingDeleteDataSource, setPendingDeleteDataSource] = useState<DataSource | null>(null);
  const [isDeletingDataSource, setIsDeletingDataSource] = useState(false);
  const [deleteDataSourceError, setDeleteDataSourceError] = useState<string | null>(null);
  const {
    services: { dataSourcesClient, toasts },
  } = useKibana<DataFederationKibanaServices>();

  const existingDataSourceNames = useMemo(() => items.map((ds) => ds.name), [items]);

  const onClose = useCallback(
    (result?: { savedChanges?: boolean }) => {
      setFlyout({ mode: 'closed' });
      onFlyoutClose(result);
    },
    [onFlyoutClose]
  );

  const handleDeleteDataSource = useCallback((item: DataSource) => {
    setPendingDeleteDataSource(item);
    setDeleteDataSourceError(null);
  }, []);

  const cancelDeleteDataSource = useCallback(() => {
    if (isDeletingDataSource) {
      return;
    }
    setPendingDeleteDataSource(null);
    setDeleteDataSourceError(null);
  }, [isDeletingDataSource]);

  const confirmDeleteDataSource = useCallback(async () => {
    if (!pendingDeleteDataSource) {
      return;
    }
    setIsDeletingDataSource(true);
    setDeleteDataSourceError(null);
    try {
      await dataSourcesClient.delete(pendingDeleteDataSource.name);
      tableProps.onSelectionChange([]);
      setPendingDeleteDataSource(null);
      onFlyoutClose({ savedChanges: true });
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
  }, [dataSourcesClient, onFlyoutClose, pendingDeleteDataSource, tableProps, toasts]);

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
        {...tableProps}
        items={items}
        onCreate={() => setFlyout({ mode: 'create' })}
        onEdit={(item: DataSource) =>
          setFlyout({
            mode: 'edit',
            dataSource: dataSourceFromListItem(item),
          })
        }
        onDelete={handleDeleteDataSource}
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
    </>
  );
};

export type { DataSource };
