/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn, EuiTabbedContentTab } from '@elastic/eui';
import {
  EuiButton,
  EuiInMemoryTable,
  EuiPageSection,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';

import type { HttpSetup } from '@kbn/core/public';
import type { DataSetWithName, DataSourceWithSecrets, DataSource } from '../common';
import { CreateDatasetFlyout } from './create_dataset_flyout';
import { HttpDataSetsClient } from './http_data_sets_client';
import { HttpDataSourcesClient } from './http_data_sources_client';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { dataSourceFromListItem } from './create_data_source_flyout/data_source_flyout_initial_values';
import { getDataSourceTypeLabel } from './get_data_source_type_label';
import { getFlyoutSaveErrorMessage } from './get_flyout_save_error_message';

/** Data set row in the table; `type` is resolved from the linked data source. */
type DataSetListRow = DataSetWithName & { type?: DataSource['type'] };

type DataSourceFlyoutState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; dataSource: DataSourceWithSecrets };

export interface DataSourcesPageProps {
  pageTitle: string;
  httpClient: HttpSetup;
}

export const DataSourcesPage: FunctionComponent<DataSourcesPageProps> = ({
  pageTitle,
  httpClient,
}) => {
  const dataClient = useMemo(() => new HttpDataSourcesClient(httpClient), [httpClient]);
  const dataSetsClient = useMemo(() => new HttpDataSetsClient(httpClient), [httpClient]);
  const [items, setItems] = useState<DataSource[]>([]);
  const [selectedItems, setSelectedItems] = useState<DataSource[]>([]);
  const [dataSetsRaw, setDataSetsRaw] = useState<DataSetWithName[]>([]);
  const [dataSourceFlyout, setDataSourceFlyout] = useState<DataSourceFlyoutState>({
    kind: 'closed',
  });
  const [isCreateDatasetFlyoutOpen, setCreateDatasetFlyoutOpen] = useState(false);

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

  const handleCreateDatasetSave = useCallback(
    async (dataSet: DataSetWithName): Promise<string | null> => {
      try {
        await dataSetsClient.add(dataSet);
        setDataSetsRaw(await dataSetsClient.get());
        setCreateDatasetFlyoutOpen(false);
        return null;
      } catch (e) {
        return getFlyoutSaveErrorMessage(e);
      }
    },
    [dataSetsClient]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<DataSource>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('dataSets.table.columnName', {
          defaultMessage: 'name',
        }),
        sortable: true,
        width: '22%',
        'data-test-subj': 'dataSetsColName',
      },
      {
        field: 'type',
        name: i18n.translate('dataSets.table.columnType', {
          defaultMessage: 'Type',
        }),
        sortable: true,
        width: '18%',
        render: (value: DataSource['type']) => getDataSourceTypeLabel(value),
        'data-test-subj': 'dataSetsColType',
      },
      {
        field: 'description',
        name: i18n.translate('dataSets.table.columnDescription', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        truncateText: true,
        'data-test-subj': 'dataSetsColDescription',
      },
      {
        name: i18n.translate('dataSets.table.columnActions', {
          defaultMessage: 'Actions',
        }),
        width: '8%',
        actions: [
          {
            name: i18n.translate('dataSets.table.editAction', {
              defaultMessage: 'Edit',
            }),
            description: i18n.translate('dataSets.table.editActionDescription', {
              defaultMessage: 'Edit data source',
            }),
            icon: 'pencil',
            type: 'icon',
            onClick: (item) => {
              handleEditDataSource(item);
            },
            'data-test-subj': 'dataSetsEditButton',
          },
        ],
      },
    ],
    [handleEditDataSource]
  );

  const dataSetColumns = useMemo<Array<EuiBasicTableColumn<DataSetListRow>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('dataSets.setsTable.columnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSetsSetsColName',
      },
      {
        field: 'data_source',
        name: i18n.translate('dataSets.setsTable.columnDataSourceId', {
          defaultMessage: 'Data source',
        }),
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSetsSetsColDataSourceId',
      },
      {
        field: 'type',
        name: i18n.translate('dataSets.setsTable.columnDataSourceType', {
          defaultMessage: 'Data source type',
        }),
        render: (type: DataSetListRow['type']) =>
          type
            ? getDataSourceTypeLabel(type)
            : i18n.translate('dataSets.setsTable.dataSourceTypeMissing', {
                defaultMessage: 'Unknown',
              }),
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSetsSetsColDataSourceType',
      },
      {
        field: 'resource',
        name: i18n.translate('dataSets.setsTable.columnResource', {
          defaultMessage: 'Resource',
        }),
        sortable: true,
        width: '22%',
        'data-test-subj': 'dataSetsSetsColResource',
      },
      {
        field: 'description',
        name: i18n.translate('dataSets.setsTable.columnDescription', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        truncateText: true,
        'data-test-subj': 'dataSetsSetsColDescription',
      },
    ],
    []
  );

  const tabs = useMemo<EuiTabbedContentTab[]>(
    () => [
      {
        id: 'sets',
        name: i18n.translate('dataSets.tabs.setsWithCount', {
          defaultMessage: 'Sets ({count})',
          values: { count: dataSetItems.length },
        }),
        content: (
          <>
            <EuiSpacer size="m" />
            <EuiInMemoryTable<DataSetListRow>
              items={dataSetItems}
              itemId="name"
              columns={dataSetColumns}
              search={{
                box: {
                  incremental: true,
                  placeholder: i18n.translate('dataSets.setsSearch.placeholder', {
                    defaultMessage: 'Search data sets…',
                  }),
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
                toolsRight: (
                  <EuiButton
                    color="primary"
                    data-test-subj="dataSetsSetsCreateButton"
                    iconType="plusInCircle"
                    onClick={() => setCreateDatasetFlyoutOpen(true)}
                  >
                    {i18n.translate('dataSets.setsAddButtonLabel', {
                      defaultMessage: 'Add',
                    })}
                  </EuiButton>
                ),
              }}
              rowHeader="name"
              sorting
              pagination={{
                pageSizeOptions: [5, 10, 20],
                initialPageSize: 10,
              }}
              data-test-subj="dataSetsSetsTable"
              tableCaption={i18n.translate('dataSets.setsTable.caption', {
                defaultMessage: 'Data sets',
              })}
              noItemsMessage={i18n.translate('dataSets.setsTable.noItems', {
                defaultMessage: 'No data sets found',
              })}
              tableLayout="auto"
              responsiveBreakpoint={false}
            />
          </>
        ),
      },
      {
        id: 'sources',
        name: i18n.translate('dataSets.tabs.sourcesWithCount', {
          defaultMessage: 'Sources ({count})',
          values: { count: items.length },
        }),
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
                  placeholder: i18n.translate('dataSets.search.placeholder', {
                    defaultMessage: 'Search data sources…',
                  }),
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
                      {i18n.translate('dataSets.deleteButtonLabel', {
                        defaultMessage: 'Delete',
                      })}
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
                    {i18n.translate('dataSets.addButtonLabel', {
                      defaultMessage: 'Add',
                    })}
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
              tableCaption={i18n.translate('dataSets.table.caption', {
                defaultMessage: 'Data sources',
              })}
              noItemsMessage={i18n.translate('dataSets.table.noItems', {
                defaultMessage: 'No data sources found',
              })}
              tableLayout="auto"
              responsiveBreakpoint={false}
            />
          </>
        ),
      },
    ],
    [columns, dataClient, dataSetColumns, dataSetItems, items, selectedItems]
  );

  return (
    <>
      <EuiPageSection paddingSize="m">
        <EuiTitle size="l">
          <h1 data-test-subj="dataSetsPageTitle">{pageTitle}</h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiTabbedContent
          tabs={tabs}
          initialSelectedTab={tabs[0]}
          autoFocus="selected"
          data-test-subj="dataSetsTabs"
        />
      </EuiPageSection>
      {dataSourceFlyout.kind !== 'closed' ? (
        <CreateDataSourceFlyout
          key={dataSourceFlyout.kind === 'edit' ? dataSourceFlyout.dataSource.name : 'create'}
          initialDataSource={
            dataSourceFlyout.kind === 'edit' ? dataSourceFlyout.dataSource : undefined
          }
          onClose={() => setDataSourceFlyout({ kind: 'closed' })}
          onSave={handleDataSourceSave}
        />
      ) : null}
      {isCreateDatasetFlyoutOpen ? (
        <CreateDatasetFlyout
          dataSources={items}
          onClose={() => setCreateDatasetFlyoutOpen(false)}
          onSave={handleCreateDatasetSave}
        />
      ) : null}
    </>
  );
};
