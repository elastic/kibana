/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataSetWithName, DataSource } from '../common';
import { ConfirmDeleteDataSetModal } from './confirm_delete_data_set_modal';
import { ConfirmDeleteDataSetsModal } from './confirm_delete_data_sets_modal';
import { buildCreateDatasetWizardPath } from './create_dataset_wizard/dataset_wizard_flow_variant';
import type { DatasetWizardFlowVariant } from './create_dataset_wizard/dataset_wizard_flow_variant';
import { DatasetsTable, type DataSetListRow } from './datasets_table';
import { getFlyoutSaveErrorMessage } from './get_flyout_save_error_message';
import { mainTranslations } from './main_i18n';
import type { DataFederationKibanaServices } from './types';

export interface DatasetsTabContentProps {
  dataSources: DataSource[];
  dataSets: DataSetWithName[];
  loadDataSets: () => Promise<void>;
}

export const DatasetsTabContent: FunctionComponent<DatasetsTabContentProps> = ({
  dataSources,
  dataSets,
  loadDataSets,
}) => {
  const history = useHistory();
  const {
    services: { datasetsClient, toasts },
  } = useKibana<DataFederationKibanaServices>();

  const [selectedDataSets, setSelectedDataSets] = useState<DataSetListRow[]>([]);
  const [dataSourceFilter, setDataSourceFilter] = useState<string>('');
  const [pendingDeleteDataSet, setPendingDeleteDataSet] = useState<DataSetListRow | null>(null);
  const [isDeletingDataSet, setIsDeletingDataSet] = useState(false);
  const [deleteDataSetError, setDeleteDataSetError] = useState<string | null>(null);
  const [pendingDeleteDataSets, setPendingDeleteDataSets] = useState<
    readonly DataSetListRow[] | null
  >(null);
  const [isDeletingDataSets, setIsDeletingDataSets] = useState(false);
  const [deleteDataSetsError, setDeleteDataSetsError] = useState<string | null>(null);

  const dataSetItems: DataSetListRow[] = useMemo(() => {
    const sourceByName = new Map(dataSources.map((ds) => [ds.name, ds] as const));
    return dataSets.map((ds) => ({
      ...ds,
      type: sourceByName.get(ds.data_source)?.type,
    }));
  }, [dataSets, dataSources]);

  const dataSourceFilterOptions = useMemo(
    () => [
      { value: '', text: mainTranslations.filters.allDataSources },
      ...dataSources
        .map((ds) => ds.name)
        .sort()
        .map((name) => ({ value: name, text: name })),
    ],
    [dataSources]
  );

  useEffect(() => {
    if (dataSourceFilter && !dataSources.some((ds) => ds.name === dataSourceFilter)) {
      setDataSourceFilter('');
    }
  }, [dataSourceFilter, dataSources]);

  useEffect(() => {
    setSelectedDataSets([]);
  }, [dataSourceFilter]);

  const filteredDataSetItems = useMemo(() => {
    if (!dataSourceFilter) {
      return dataSetItems;
    }
    return dataSetItems.filter((ds) => ds.data_source === dataSourceFilter);
  }, [dataSetItems, dataSourceFilter]);

  const handleDeleteDataSet = useCallback((item: DataSetListRow) => {
    setPendingDeleteDataSet(item);
    setDeleteDataSetError(null);
  }, []);

  const handleDeleteSelectedDataSets = useCallback((nextItems: readonly DataSetListRow[]) => {
    setPendingDeleteDataSets(nextItems);
    setDeleteDataSetsError(null);
  }, []);

  const cancelDeleteDataSet = useCallback(() => {
    if (isDeletingDataSet) {
      return;
    }
    setPendingDeleteDataSet(null);
    setDeleteDataSetError(null);
  }, [isDeletingDataSet]);

  const cancelDeleteDataSets = useCallback(() => {
    if (isDeletingDataSets) {
      return;
    }
    setPendingDeleteDataSets(null);
    setDeleteDataSetsError(null);
  }, [isDeletingDataSets]);

  const confirmDeleteDataSet = useCallback(async () => {
    if (!pendingDeleteDataSet) {
      return;
    }
    setIsDeletingDataSet(true);
    setDeleteDataSetError(null);
    try {
      await datasetsClient.delete(pendingDeleteDataSet.name);
      setSelectedDataSets([]);
      setPendingDeleteDataSet(null);
      void loadDataSets();
    } catch (e) {
      const message = getFlyoutSaveErrorMessage(e);
      setDeleteDataSetError(message);
      toasts.addDanger({
        title: mainTranslations.confirmDeleteDataSet.errorTitle,
        text: message,
      });
    } finally {
      setIsDeletingDataSet(false);
    }
  }, [datasetsClient, loadDataSets, pendingDeleteDataSet, toasts]);

  const confirmDeleteDataSets = useCallback(async () => {
    if (!pendingDeleteDataSets || pendingDeleteDataSets.length === 0) {
      return;
    }

    setIsDeletingDataSets(true);
    setDeleteDataSetsError(null);
    try {
      await datasetsClient.delete(pendingDeleteDataSets.map((item) => item.name));
      setSelectedDataSets([]);
      setPendingDeleteDataSets(null);
      void loadDataSets();
    } catch (e) {
      const message = getFlyoutSaveErrorMessage(e);
      setDeleteDataSetsError(message);
      toasts.addDanger({
        title: mainTranslations.confirmDeleteDataSets.errorTitle,
        text: message,
      });
    } finally {
      setIsDeletingDataSets(false);
    }
  }, [datasetsClient, loadDataSets, pendingDeleteDataSets, toasts]);

  const handleCreate = useCallback(
    (flowVariant: DatasetWizardFlowVariant) => {
      history.push(buildCreateDatasetWizardPath(flowVariant));
    },
    [history]
  );

  const handleEdit = useCallback(
    (item: DataSetListRow) => {
      history.push(`/edit/${encodeURIComponent(item.name)}`);
    },
    [history]
  );

  return (
    <>
      <DatasetsTable
        filteredItems={filteredDataSetItems}
        selectedItems={selectedDataSets}
        dataSourceFilterOptions={dataSourceFilterOptions}
        dataSourceFilter={dataSourceFilter}
        isCreateDisabled={dataSources.length === 0}
        onSelectionChange={setSelectedDataSets}
        onDataSourceFilterChange={setDataSourceFilter}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDeleteDataSet}
        onDeleteSelected={handleDeleteSelectedDataSets}
      />
      {pendingDeleteDataSet ? (
        <ConfirmDeleteDataSetModal
          dataSetName={pendingDeleteDataSet.name}
          isDeleting={isDeletingDataSet}
          error={deleteDataSetError}
          onConfirm={() => void confirmDeleteDataSet()}
          onCancel={cancelDeleteDataSet}
        />
      ) : null}
      {pendingDeleteDataSets ? (
        <ConfirmDeleteDataSetsModal
          dataSetNames={pendingDeleteDataSets.map((ds) => ds.name)}
          isDeleting={isDeletingDataSets}
          error={deleteDataSetsError}
          onConfirm={() => void confirmDeleteDataSets()}
          onCancel={cancelDeleteDataSets}
        />
      ) : null}
    </>
  );
};
