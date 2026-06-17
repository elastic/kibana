/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiBasicTableColumn, EuiTabbedContentTab } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPageSection,
  EuiSelect,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';

import type { HttpSetup } from '@kbn/core/public';
import type { DataSetWithName, DataSourceWithSecrets, DataSource } from '../common';
import { CreateDatasetFlyout } from './create_dataset_flyout';
import { dataSetFromListItem } from './create_dataset_flyout/dataset_flyout_initial_values';
import { DatasetsClient } from './datasets_client';
import { DataSourcesClient } from './data_sources_client';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { dataSourceFromListItem } from './create_data_source_flyout/data_source_flyout_initial_values';
import { getDataSourceTypeVerbose } from './get_data_source_type_label';
import { getFlyoutSaveErrorMessage } from './get_flyout_save_error_message';
import { mainTranslations } from './main_i18n';
import { ConfirmDeleteDataSourceModal } from './confirm_delete_data_source_modal';
import { ConfirmDeleteDataSetModal } from './confirm_delete_data_set_modal';

/** Data set row in the table; `type` is resolved from the linked data source. */
type DataSetListRow = DataSetWithName & { type?: DataSource['type'] };

type DataSourceFlyoutState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; dataSource: DataSourceWithSecrets };

type DataSetFlyoutState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; dataSet: DataSetWithName };

export interface MainProps {
  httpClient: HttpSetup;
}

export const Main: FunctionComponent<MainProps> = ({ httpClient }) => {
  const dataClient = useMemo(() => new DataSourcesClient(httpClient), [httpClient]);
  const dataSetsClient = useMemo(() => new DatasetsClient(httpClient), [httpClient]);
  const [items, setItems] = useState<DataSource[]>([]);
  const [selectedItems, setSelectedItems] = useState<DataSource[]>([]);
  const [selectedDataSets, setSelectedDataSets] = useState<DataSetListRow[]>([]);
  const [dataSourceFilter, setDataSourceFilter] = useState<string>('');
  const [pendingDeleteDataSource, setPendingDeleteDataSource] = useState<DataSource | null>(null);
  const [isDeletingDataSource, setIsDeletingDataSource] = useState(false);
  const [deleteDataSourceError, setDeleteDataSourceError] = useState<string | null>(null);
  const [pendingDeleteDataSet, setPendingDeleteDataSet] = useState<DataSetListRow | null>(null);
  const [isDeletingDataSet, setIsDeletingDataSet] = useState(false);
  const [deleteDataSetError, setDeleteDataSetError] = useState<string | null>(null);
  const [dataSetsRaw, setDataSetsRaw] = useState<DataSetWithName[]>([]);
  const [dataSourceFlyout, setDataSourceFlyout] = useState<DataSourceFlyoutState>({
    kind: 'closed',
  });
  const [dataSetFlyout, setDataSetFlyout] = useState<DataSetFlyoutState>({ kind: 'closed' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextItems = await dataClient.get();
      if (!cancelled) {
        setItems(nextItems);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataClient]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const nextItems = await dataSetsClient.get();
        if (!cancelled) {
          setDataSetsRaw(nextItems);
        }
      } catch {
        if (!cancelled) {
          setDataSetsRaw([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSetsClient]);

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

  const handleDataSourceSave = useCallback(
    async (dataSource: DataSourceWithSecrets): Promise<string | null> => {
      try {
        await dataClient.add(dataSource);
        setItems(await dataClient.get());
        setDataSourceFlyout({ kind: 'closed' });
        return null;
      } catch (e) {
        return getFlyoutSaveErrorMessage(e);
      }
    },
    [dataClient]
  );

  const handleEditDataSource = useCallback((item: DataSource) => {
    setDataSourceFlyout({
      kind: 'edit',
      dataSource: dataSourceFromListItem(item),
    });
  }, []);

  const handleDeleteDataSource = useCallback((item: DataSource) => {
    setPendingDeleteDataSource(item);
    setDeleteDataSourceError(null);
  }, []);

  const confirmDeleteDataSource = useCallback(async () => {
    if (!pendingDeleteDataSource) {
      return;
    }
    setIsDeletingDataSource(true);
    setDeleteDataSourceError(null);
    try {
      await dataClient.delete(pendingDeleteDataSource.name);
      setItems(await dataClient.get());
      setSelectedItems([]);
      setPendingDeleteDataSource(null);
    } catch (e) {
      setDeleteDataSourceError(getFlyoutSaveErrorMessage(e));
    } finally {
      setIsDeletingDataSource(false);
    }
  }, [dataClient, pendingDeleteDataSource]);

  const cancelDeleteDataSource = useCallback(() => {
    if (isDeletingDataSource) {
      return;
    }
    setPendingDeleteDataSource(null);
    setDeleteDataSourceError(null);
  }, [isDeletingDataSource]);

  const handleDataSetSave = useCallback(
    async (dataSet: DataSetWithName): Promise<string | null> => {
      try {
        await dataSetsClient.add(dataSet);
        setDataSetsRaw(await dataSetsClient.get());
        setDataSetFlyout({ kind: 'closed' });
        return null;
      } catch (e) {
        return getFlyoutSaveErrorMessage(e);
      }
    },
    [dataSetsClient]
  );

  const handleEditDataSet = useCallback((item: DataSetListRow) => {
    setDataSetFlyout({
      kind: 'edit',
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
      await dataSetsClient.delete(pendingDeleteDataSet.name);
      setDataSetsRaw(await dataSetsClient.get());
      setSelectedDataSets([]);
      setPendingDeleteDataSet(null);
    } catch (e) {
      setDeleteDataSetError(getFlyoutSaveErrorMessage(e));
    } finally {
      setIsDeletingDataSet(false);
    }
  }, [dataSetsClient, pendingDeleteDataSet]);

  const cancelDeleteDataSet = useCallback(() => {
    if (isDeletingDataSet) {
      return;
    }
    setPendingDeleteDataSet(null);
    setDeleteDataSetError(null);
  }, [isDeletingDataSet]);

  const columns = useMemo<Array<EuiBasicTableColumn<DataSource>>>(
    () => [
      {
        field: 'name',
        name: mainTranslations.columns.dataSources.name,
        sortable: true,
        width: '22%',
        'data-test-subj': 'dataSetsColName',
      },
      {
        name: mainTranslations.columns.dataSources.dataSetsCount,
        width: '10%',
        render: (item: DataSource) => dataSetsCountByDataSource.get(item.name) ?? 0,
        'data-test-subj': 'dataSetsColDataSetsCount',
      },
      {
        field: 'type',
        name: mainTranslations.columns.dataSources.type,
        sortable: true,
        width: '18%',
        render: (value: DataSource['type']) => getDataSourceTypeVerbose(value),
        'data-test-subj': 'dataSetsColType',
      },
      {
        field: 'description',
        name: mainTranslations.columns.dataSources.description,
        sortable: true,
        truncateText: true,
        'data-test-subj': 'dataSetsColDescription',
      },
      {
        name: mainTranslations.columns.dataSources.actions,
        width: '8%',
        actions: [
          {
            name: mainTranslations.columns.dataSources.editAction,
            description: mainTranslations.columns.dataSources.editActionDescription,
            icon: 'pencil',
            type: 'icon',
            onClick: (item) => {
              handleEditDataSource(item);
            },
            'data-test-subj': 'dataSetsEditButton',
          },
          {
            name: mainTranslations.columns.dataSources.deleteAction,
            description: mainTranslations.columns.dataSources.deleteActionDescription,
            icon: 'trash',
            color: 'danger',
            type: 'icon',
            onClick: (item) => {
              handleDeleteDataSource(item);
            },
            'data-test-subj': 'dataSetsDeleteIconButton',
          },
        ],
      },
    ],
    [dataSetsCountByDataSource, handleDeleteDataSource, handleEditDataSource]
  );

  const dataSetColumns = useMemo<Array<EuiBasicTableColumn<DataSetListRow>>>(
    () => [
      {
        field: 'name',
        name: mainTranslations.columns.dataSets.name,
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSetsSetsColName',
      },
      {
        field: 'data_source',
        name: mainTranslations.columns.dataSets.dataSourceId,
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSetsSetsColDataSourceId',
      },
      {
        field: 'type',
        name: mainTranslations.columns.dataSets.dataSourceType,
        render: (type: DataSetListRow['type']) =>
          type
            ? getDataSourceTypeVerbose(type)
            : mainTranslations.columns.dataSets.dataSourceTypeMissing,
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSetsSetsColDataSourceType',
      },
      {
        field: 'resource',
        name: mainTranslations.columns.dataSets.resource,
        sortable: true,
        width: '22%',
        'data-test-subj': 'dataSetsSetsColResource',
      },
      {
        field: 'description',
        name: mainTranslations.columns.dataSets.description,
        sortable: true,
        truncateText: true,
        'data-test-subj': 'dataSetsSetsColDescription',
      },
      {
        name: mainTranslations.columns.dataSets.actions,
        width: '8%',
        actions: [
          {
            name: mainTranslations.columns.dataSets.editAction,
            description: mainTranslations.columns.dataSets.editActionDescription,
            icon: 'pencil',
            type: 'icon',
            onClick: (item) => {
              handleEditDataSet(item);
            },
            'data-test-subj': 'dataSetsSetsEditButton',
          },
          {
            name: mainTranslations.columns.dataSets.deleteAction,
            description: mainTranslations.columns.dataSets.deleteActionDescription,
            icon: 'trash',
            color: 'danger',
            type: 'icon',
            onClick: (item) => {
              handleDeleteDataSet(item);
            },
            'data-test-subj': 'dataSetsSetsDeleteIconButton',
          },
        ],
      },
    ],
    [handleDeleteDataSet, handleEditDataSet]
  );

  const tabs = useMemo<EuiTabbedContentTab[]>(
    () => [
      {
        id: 'sets',
        name: mainTranslations.tabs.sets,
        content: (
          <>
            <EuiSpacer size="m" />
            <EuiInMemoryTable<DataSetListRow>
              items={filteredDataSetItems}
              itemId="name"
              columns={dataSetColumns}
              search={{
                box: {
                  incremental: true,
                  placeholder: mainTranslations.columns.dataSets.searchPlaceholder,
                  'data-test-subj': 'dataSetsSetsSearch',
                  schema: {
                    fields: {
                      name: { type: 'string' },
                      data_source: { type: 'string' },
                      type: { type: 'string' },
                      resource: { type: 'string' },
                      description: { type: 'string' },
                    },
                  },
                },
                toolsLeft:
                  selectedDataSets.length > 0 ? (
                    <EuiButton
                      color="danger"
                      data-test-subj="dataSetsSetsDeleteButton"
                      iconType="trash"
                      onClick={() => {
                        void (async () => {
                          await dataSetsClient.delete(selectedDataSets.map((item) => item.name));
                          setDataSetsRaw(await dataSetsClient.get());
                          setSelectedDataSets([]);
                        })();
                      }}
                    >
                      {mainTranslations.actions.deleteButtonLabel}
                    </EuiButton>
                  ) : undefined,
                toolsRight: (
                  <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiSelect
                        compressed
                        data-test-subj="dataSetsSetsDataSourceFilter"
                        aria-label={mainTranslations.filters.dataSource}
                        options={dataSourceFilterOptions}
                        value={dataSourceFilter}
                        onChange={(e) => setDataSourceFilter(e.target.value)}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        color="primary"
                        data-test-subj="dataSetsSetsCreateButton"
                        iconType="plusInCircle"
                        onClick={() => setDataSetFlyout({ kind: 'create' })}
                      >
                        {mainTranslations.columns.dataSets.addButtonLabel}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ),
              }}
              rowHeader="name"
              selection={{
                selected: selectedDataSets,
                onSelectionChange: setSelectedDataSets,
              }}
              sorting
              pagination={{
                pageSizeOptions: [5, 10, 20],
                initialPageSize: 10,
              }}
              data-test-subj="dataSetsSetsTable"
              tableCaption={mainTranslations.columns.dataSets.caption}
              noItemsMessage={mainTranslations.columns.dataSets.noItems}
              tableLayout="auto"
              responsiveBreakpoint={false}
            />
          </>
        ),
      },
      {
        id: 'sources',
        name: mainTranslations.tabs.sources,
        content: (
          <>
            <EuiSpacer size="m" />
            <EuiInMemoryTable<DataSource>
              items={items}
              itemId="name"
              columns={columns}
              search={{
                box: {
                  incremental: true,
                  placeholder: mainTranslations.columns.dataSources.searchPlaceholder,
                  'data-test-subj': 'dataSetsSearch',
                  schema: {
                    fields: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      description: { type: 'string' },
                    },
                  },
                },
                toolsLeft:
                  selectedItems.length > 0 ? (
                    <EuiButton
                      color="danger"
                      data-test-subj="dataSetsDeleteButton"
                      iconType="trash"
                      onClick={() => {
                        void (async () => {
                          await dataClient.delete(selectedItems.map((item) => item.name));
                          setItems(await dataClient.get());
                          setSelectedItems([]);
                        })();
                      }}
                    >
                      {mainTranslations.actions.deleteButtonLabel}
                    </EuiButton>
                  ) : undefined,
                toolsRight: (
                  <EuiButton
                    color="primary"
                    data-test-subj="dataSetsCreateButton"
                    iconType="plusInCircle"
                    onClick={() => {
                      setDataSourceFlyout({ kind: 'create' });
                    }}
                  >
                    {mainTranslations.actions.addButtonLabel}
                  </EuiButton>
                ),
              }}
              rowHeader="name"
              selection={{
                selected: selectedItems,
                onSelectionChange: setSelectedItems,
              }}
              sorting
              pagination={{
                pageSizeOptions: [5, 10, 20],
                initialPageSize: 10,
              }}
              data-test-subj="dataSetsTable"
              tableCaption={mainTranslations.columns.dataSources.caption}
              noItemsMessage={mainTranslations.columns.dataSources.noItems}
              tableLayout="auto"
              responsiveBreakpoint={false}
            />
          </>
        ),
      },
    ],
    [
      columns,
      dataClient,
      dataSetColumns,
      dataSourceFilter,
      dataSourceFilterOptions,
      dataSetsClient,
      filteredDataSetItems,
      items,
      selectedDataSets,
      selectedItems,
    ]
  );

  return (
    <>
      <EuiPageSection paddingSize="m">
        <EuiTitle size="l">
          <h1 data-test-subj="dataSetsPageTitle">{mainTranslations.pageTitle}</h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiTabbedContent
          tabs={tabs}
          initialSelectedTab={tabs[0]}
          autoFocus="selected"
          data-test-subj="dataSetsTabs"
        />
      </EuiPageSection>
      {pendingDeleteDataSource ? (
        <ConfirmDeleteDataSourceModal
          dataSourceName={pendingDeleteDataSource.name}
          isDeleting={isDeletingDataSource}
          error={deleteDataSourceError}
          onConfirm={() => void confirmDeleteDataSource()}
          onCancel={cancelDeleteDataSource}
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
      {dataSourceFlyout.kind !== 'closed' ? (
        <CreateDataSourceFlyout
          key={dataSourceFlyout.kind === 'edit' ? dataSourceFlyout.dataSource.name : 'create'}
          initialDataSource={
            dataSourceFlyout.kind === 'edit' ? dataSourceFlyout.dataSource : undefined
          }
          existingDataSourceNames={items.map((ds) => ds.name)}
          onClose={() => setDataSourceFlyout({ kind: 'closed' })}
          onSave={handleDataSourceSave}
        />
      ) : null}
      {dataSetFlyout.kind !== 'closed' ? (
        <CreateDatasetFlyout
          key={dataSetFlyout.kind === 'edit' ? dataSetFlyout.dataSet.name : 'create'}
          initialDataSet={dataSetFlyout.kind === 'edit' ? dataSetFlyout.dataSet : undefined}
          existingDataSetNames={dataSetsRaw.map((ds) => ds.name)}
          dataSources={items}
          onClose={() => setDataSetFlyout({ kind: 'closed' })}
          onSave={handleDataSetSave}
        />
      ) : null}
    </>
  );
};
