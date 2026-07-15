/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiLink,
  EuiPageHeader,
  EuiPageSection,
  EuiTabbedContent,
} from '@elastic/eui';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataSetWithName, DataSource } from '../common';
import { dataSetFromListItem } from './create_dataset_flyout/dataset_flyout_initial_values';
import { getFlyoutSaveErrorMessage } from './get_flyout_save_error_message';
import { mainTranslations } from './main_i18n';
import { ConfirmDeleteDataSourcesModal } from './confirm_delete_data_sources_modal';
import { ConfirmDeleteDataSetModal } from './confirm_delete_data_set_modal';
import { ConfirmDeleteDataSetsModal } from './confirm_delete_data_sets_modal';
import type { DataSetListRow } from './datasets_table';
import { DataSourcesTabContent } from './data_sources_tab_content';
import {
  DatasetsTabContent,
  DatasetsTabFlyout,
  type DataSetFlyoutState,
} from './datasets_tab_content';
import type { DataFederationKibanaServices } from './types';

export const Main: FunctionComponent = () => {
  const {
    services: { dataSourcesClient, datasetsClient, toasts },
  } = useKibana<DataFederationKibanaServices>();

  const [items, setItems] = useState<DataSource[]>([]);
  const [selectedItems, setSelectedItems] = useState<DataSource[]>([]);
  const [selectedDataSets, setSelectedDataSets] = useState<DataSetListRow[]>([]);
  const [dataSourceFilter, setDataSourceFilter] = useState<string>('');
  const [hasLoadedDataSources, setHasLoadedDataSources] = useState(false);
  const [hasLoadedDataSets, setHasLoadedDataSets] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<'sets' | 'sources'>('sets');
  const [hasUserSelectedTab, setHasUserSelectedTab] = useState(false);
  const [pendingDeleteDataSources, setPendingDeleteDataSources] = useState<
    readonly DataSource[] | null
  >(null);
  const [isDeletingDataSources, setIsDeletingDataSources] = useState(false);
  const [deleteDataSourcesError, setDeleteDataSourcesError] = useState<string | null>(null);
  const [pendingDeleteDataSet, setPendingDeleteDataSet] = useState<DataSetListRow | null>(null);
  const [isDeletingDataSet, setIsDeletingDataSet] = useState(false);
  const [deleteDataSetError, setDeleteDataSetError] = useState<string | null>(null);
  const [pendingDeleteDataSets, setPendingDeleteDataSets] = useState<
    readonly DataSetListRow[] | null
  >(null);
  const [isDeletingDataSets, setIsDeletingDataSets] = useState(false);
  const [deleteDataSetsError, setDeleteDataSetsError] = useState<string | null>(null);
  const [dataSetsRaw, setDataSetsRaw] = useState<DataSetWithName[]>([]);
  const [dataSetFlyout, setDataSetFlyout] = useState<DataSetFlyoutState>({ mode: 'closed' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const nextItems = await dataSourcesClient.get();
        if (!cancelled) {
          setItems(nextItems);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setHasLoadedDataSources(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSourcesClient]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const nextItems = await datasetsClient.get();
        if (!cancelled) {
          setDataSetsRaw(nextItems);
        }
      } catch {
        if (!cancelled) {
          setDataSetsRaw([]);
        }
      } finally {
        if (!cancelled) {
          setHasLoadedDataSets(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [datasetsClient]);

  useEffect(() => {
    if (hasUserSelectedTab || !hasLoadedDataSources || !hasLoadedDataSets) {
      return;
    }

    if (items.length === 0 && dataSetsRaw.length === 0) {
      setSelectedTabId('sources');
    }
  }, [
    dataSetsRaw.length,
    hasLoadedDataSets,
    hasLoadedDataSources,
    hasUserSelectedTab,
    items.length,
  ]);

  const dataSetItems: DataSetListRow[] = useMemo(() => {
    const sourceByName = new Map(items.map((ds) => [ds.name, ds] as const));
    return dataSetsRaw.map((ds) => ({
      ...ds,
      type: sourceByName.get(ds.data_source)?.type,
    }));
  }, [dataSetsRaw, items]);

  const dataSetsCountByDataSource = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ds of dataSetsRaw) {
      counts.set(ds.data_source, (counts.get(ds.data_source) ?? 0) + 1);
    }
    return counts;
  }, [dataSetsRaw]);

  useEffect(() => {
    setSelectedItems((prev) =>
      prev.filter((item) => (dataSetsCountByDataSource.get(item.name) ?? 0) === 0)
    );
  }, [dataSetsCountByDataSource]);

  const dataSourceFilterOptions = useMemo(
    () => [
      { value: '', text: mainTranslations.filters.allDataSources },
      ...[...new Set(items.map((ds) => ds.name))]
        .sort()
        .map((name) => ({ value: name, text: name })),
    ],
    [items]
  );

  useEffect(() => {
    if (dataSourceFilter && !items.some((ds) => ds.name === dataSourceFilter)) {
      setDataSourceFilter('');
    }
  }, [dataSourceFilter, items]);

  useEffect(() => {
    setSelectedDataSets([]);
  }, [dataSourceFilter]);

  const filteredDataSetItems = useMemo(() => {
    if (!dataSourceFilter) {
      return dataSetItems;
    }
    return dataSetItems.filter((ds) => ds.data_source === dataSourceFilter);
  }, [dataSetItems, dataSourceFilter]);

  const cancelDeleteDataSources = useCallback(() => {
    if (isDeletingDataSources) {
      return;
    }
    setPendingDeleteDataSources(null);
    setDeleteDataSourcesError(null);
  }, [isDeletingDataSources]);

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
      setItems(await dataSourcesClient.get());
      setSelectedItems([]);
      setPendingDeleteDataSources(null);
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
  }, [dataSetsCountByDataSource, dataSourcesClient, pendingDeleteDataSources, toasts]);

  const handleDataSetSave = useCallback(
    async (dataSet: DataSetWithName, previousId?: string): Promise<string | null> => {
      try {
        const nextId = dataSet.name.trim();
        const prevIdTrimmed = previousId?.trim();

        await datasetsClient.add(dataSet);

        if (prevIdTrimmed && prevIdTrimmed !== nextId) {
          await datasetsClient.delete(prevIdTrimmed);
        }

        setDataSetsRaw(await datasetsClient.get());
        setDataSetFlyout({ mode: 'closed' });
        return null;
      } catch (e) {
        return getFlyoutSaveErrorMessage(e);
      }
    },
    [datasetsClient]
  );

  const handleEditDataSet = useCallback((item: DataSetListRow) => {
    setDataSetFlyout({
      mode: 'edit',
      dataSet: dataSetFromListItem(item),
    });
  }, []);

  const handleDeleteDataSet = useCallback((item: DataSetListRow) => {
    setPendingDeleteDataSet(item);
    setDeleteDataSetError(null);
  }, []);

  const confirmDeleteDataSet = useCallback(async () => {
    if (!pendingDeleteDataSet) {
      return;
    }
    setIsDeletingDataSet(true);
    setDeleteDataSetError(null);
    try {
      await datasetsClient.delete(pendingDeleteDataSet.name);
      setDataSetsRaw(await datasetsClient.get());
      setSelectedDataSets([]);
      setPendingDeleteDataSet(null);
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
  }, [datasetsClient, pendingDeleteDataSet, toasts]);

  const handleDataSourceFlyoutClose = useCallback(
    (result?: { savedChanges?: boolean }) => {
      if (!result?.savedChanges) {
        return;
      }

      void (async () => {
        try {
          setItems(await dataSourcesClient.get());
        } catch {
          setItems([]);
        }
      })();
    },
    [dataSourcesClient]
  );

  const cancelDeleteDataSets = useCallback(() => {
    if (isDeletingDataSets) {
      return;
    }
    setPendingDeleteDataSets(null);
    setDeleteDataSetsError(null);
  }, [isDeletingDataSets]);

  const confirmDeleteDataSets = useCallback(async () => {
    if (!pendingDeleteDataSets || pendingDeleteDataSets.length === 0) {
      return;
    }

    setIsDeletingDataSets(true);
    setDeleteDataSetsError(null);
    try {
      await datasetsClient.delete(pendingDeleteDataSets.map((item) => item.name));
      setDataSetsRaw(await datasetsClient.get());
      setSelectedDataSets([]);
      setPendingDeleteDataSets(null);
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
  }, [datasetsClient, pendingDeleteDataSets, toasts]);

  const cancelDeleteDataSet = useCallback(() => {
    if (isDeletingDataSet) {
      return;
    }
    setPendingDeleteDataSet(null);
    setDeleteDataSetError(null);
  }, [isDeletingDataSet]);

  const handleDeleteSelectedDataSources = useCallback((nextItems: readonly DataSource[]) => {
    setPendingDeleteDataSources(nextItems);
    setDeleteDataSourcesError(null);
  }, []);

  const handleDeleteSelectedDataSets = useCallback((nextItems: readonly DataSetListRow[]) => {
    setPendingDeleteDataSets(nextItems);
    setDeleteDataSetsError(null);
  }, []);

  const tabs = useMemo<EuiTabbedContentTab[]>(
    () => [
      {
        id: 'sets',
        name: mainTranslations.tabs.sets,
        content: (
          <DatasetsTabContent
            filteredItems={filteredDataSetItems}
            selectedItems={selectedDataSets}
            dataSourceFilterOptions={dataSourceFilterOptions}
            dataSourceFilter={dataSourceFilter}
            isCreateDisabled={items.length === 0}
            onSelectionChange={setSelectedDataSets}
            onDataSourceFilterChange={setDataSourceFilter}
            onCreate={() => setDataSetFlyout({ mode: 'create' })}
            onEdit={handleEditDataSet}
            onDelete={handleDeleteDataSet}
            onDeleteSelected={handleDeleteSelectedDataSets}
          />
        ),
      },
      {
        id: 'sources',
        name: mainTranslations.tabs.sources,
        content: (
          <DataSourcesTabContent
            items={items}
            selectedItems={selectedItems}
            dataSetsCountByDataSource={dataSetsCountByDataSource}
            onSelectionChange={setSelectedItems}
            onDeleteSelected={handleDeleteSelectedDataSources}
            onFlyoutClose={handleDataSourceFlyoutClose}
          />
        ),
      },
    ],
    [
      dataSetsCountByDataSource,
      dataSourceFilter,
      dataSourceFilterOptions,
      filteredDataSetItems,
      handleDeleteDataSet,
      handleDeleteSelectedDataSets,
      handleDeleteSelectedDataSources,
      handleEditDataSet,
      handleDataSourceFlyoutClose,
      items,
      selectedDataSets,
      selectedItems,
    ]
  );

  const selectedTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [selectedTabId, tabs]
  );

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <>
            <span data-test-subj="dataSetsPageTitle">{mainTranslations.pageTitle}</span>
            &nbsp;
            <EuiBetaBadge label={mainTranslations.technicalPreview} size="m" />
          </>
        }
        description={
          <>
            {mainTranslations.pageDescription}{' '}
            <EuiLink
              href="https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation"
              target="_blank"
            >
              {mainTranslations.docsLink}
            </EuiLink>
          </>
        }
      />
      <EuiPageSection paddingSize="m">
        <EuiTabbedContent
          tabs={tabs}
          selectedTab={selectedTab}
          onTabClick={(tab) => {
            setHasUserSelectedTab(true);
            setSelectedTabId(tab.id === 'sources' ? 'sources' : 'sets');
          }}
          autoFocus="initial"
          data-test-subj="dataSetsTabs"
        />
      </EuiPageSection>
      {pendingDeleteDataSources ? (
        <ConfirmDeleteDataSourcesModal
          dataSourceNames={pendingDeleteDataSources.map((ds) => ds.name)}
          isDeleting={isDeletingDataSources}
          error={deleteDataSourcesError}
          onConfirm={() => void confirmDeleteDataSources()}
          onCancel={cancelDeleteDataSources}
        />
      ) : null}
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
      <DatasetsTabFlyout
        flyout={dataSetFlyout}
        existingDataSetNames={dataSetsRaw.map((ds) => ds.name)}
        dataSources={items}
        onClose={() => setDataSetFlyout({ mode: 'closed' })}
        onSave={handleDataSetSave}
      />
    </>
  );
};
