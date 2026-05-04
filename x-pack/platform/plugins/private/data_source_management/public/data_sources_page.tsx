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
import { getDataSourceTypeLabel } from './get_data_source_type_label';

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
  const [dataSetItems, setDataSetItems] = useState<DataSetWithName[]>([]);
  const [isCreateFlyoutOpen, setCreateFlyoutOpen] = useState(false);
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
          setDataSetItems(nextItems);
        }
      } catch {
        if (!cancelled) {
          setDataSetItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSetsClient]);

  const handleCreateDataSourceSave = useCallback(
    async (dataSource: DataSourceWithSecrets): Promise<string | null> => {
      try {
        await dataClient.add(dataSource);
        setItems(await dataClient.get());
        setCreateFlyoutOpen(false);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [dataClient]
  );

  const handleCreateDatasetSave = useCallback(
    async (dataSet: DataSetWithName): Promise<string | null> => {
      try {
        await dataSetsClient.add(dataSet);
        setDataSetItems(await dataSetsClient.get());
        setCreateDatasetFlyoutOpen(false);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [dataSetsClient]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<DataSource>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.table.columnName', {
          defaultMessage: 'name',
        }),
        sortable: true,
        width: '24%',
        'data-test-subj': 'dataSourceManagementColName',
      },
      {
        field: 'type',
        name: i18n.translate('dataSourceManagement.table.columnType', {
          defaultMessage: 'Type',
        }),
        sortable: true,
        width: '20%',
        render: (value: DataSource['type']) => getDataSourceTypeLabel(value),
        'data-test-subj': 'dataSourceManagementColType',
      },
      {
        field: 'description',
        name: i18n.translate('dataSourceManagement.table.columnDescription', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        truncateText: true,
        'data-test-subj': 'dataSourceManagementColDescription',
      },
    ],
    []
  );

  const dataSetColumns = useMemo<Array<EuiBasicTableColumn<DataSetWithName>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.dataSetsTable.columnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSourceManagementSetsColName',
      },
      {
        field: 'data_source',
        name: i18n.translate('dataSourceManagement.dataSetsTable.columnDataSourceId', {
          defaultMessage: 'Data source',
        }),
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSourceManagementSetsColDataSourceId',
      },
      {
        field: 'resource',
        name: i18n.translate('dataSourceManagement.dataSetsTable.columnResource', {
          defaultMessage: 'Resource',
        }),
        sortable: true,
        width: '22%',
        'data-test-subj': 'dataSourceManagementSetsColResource',
      },
      {
        field: 'description',
        name: i18n.translate('dataSourceManagement.dataSetsTable.columnDescription', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        truncateText: true,
        'data-test-subj': 'dataSourceManagementSetsColDescription',
      },
    ],
    []
  );

  const tabs = useMemo<EuiTabbedContentTab[]>(
    () => [
      {
        id: 'sources',
        name: i18n.translate('dataSourceManagement.tabs.sources', {
          defaultMessage: 'Sources',
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
                  placeholder: i18n.translate('dataSourceManagement.search.placeholder', {
                    defaultMessage: 'Search data sources…',
                  }),
                  'data-test-subj': 'dataSourceManagementSearch',
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
                      data-test-subj="dataSourceManagementDeleteButton"
                      iconType="trash"
                      onClick={() => {
                        void (async () => {
                          await dataClient.delete(selectedItems.map((item) => item.name));
                          setItems(await dataClient.get());
                          setSelectedItems([]);
                        })();
                      }}
                    >
                      {i18n.translate('dataSourceManagement.deleteButtonLabel', {
                        defaultMessage: 'Delete',
                      })}
                    </EuiButton>
                  ) : undefined,
                toolsRight: (
                  <EuiButton
                    color="primary"
                    data-test-subj="dataSourceManagementCreateButton"
                    iconType="plusInCircle"
                    onClick={() => {
                      setCreateFlyoutOpen(true);
                    }}
                  >
                    {i18n.translate('dataSourceManagement.addButtonLabel', {
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
              data-test-subj="dataSourceManagementTable"
              tableCaption={i18n.translate('dataSourceManagement.table.caption', {
                defaultMessage: 'Data sources',
              })}
              noItemsMessage={i18n.translate('dataSourceManagement.table.noItems', {
                defaultMessage: 'No data sources found',
              })}
              tableLayout="auto"
              responsiveBreakpoint={false}
            />
          </>
        ),
      },
      {
        id: 'sets',
        name: i18n.translate('dataSourceManagement.tabs.sets', {
          defaultMessage: 'Sets',
        }),
        content: (
          <>
            <EuiSpacer size="m" />
            <EuiInMemoryTable<DataSetWithName>
              items={dataSetItems}
              itemId="name"
              columns={dataSetColumns}
              search={{
                box: {
                  incremental: true,
                  placeholder: i18n.translate('dataSourceManagement.dataSetsSearch.placeholder', {
                    defaultMessage: 'Search data sets…',
                  }),
                  'data-test-subj': 'dataSourceManagementSetsSearch',
                  schema: {
                    fields: {
                      name: { type: 'string' },
                      dataSourceId: { type: 'string' },
                      resource: { type: 'string' },
                      description: { type: 'string' },
                    },
                  },
                },
                toolsRight: (
                  <EuiButton
                    color="primary"
                    data-test-subj="dataSourceManagementSetsCreateButton"
                    iconType="plusInCircle"
                    onClick={() => setCreateDatasetFlyoutOpen(true)}
                  >
                    {i18n.translate('dataSourceManagement.dataSetsAddButtonLabel', {
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
              data-test-subj="dataSourceManagementSetsTable"
              tableCaption={i18n.translate('dataSourceManagement.dataSetsTable.caption', {
                defaultMessage: 'Data sets',
              })}
              noItemsMessage={i18n.translate('dataSourceManagement.dataSetsTable.noItems', {
                defaultMessage: 'No data sets found',
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
          <h1 data-test-subj="dataSourceManagementPageTitle">{pageTitle}</h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiTabbedContent
          tabs={tabs}
          initialSelectedTab={tabs[0]}
          autoFocus="selected"
          data-test-subj="dataSourceManagementTabs"
        />
      </EuiPageSection>
      {isCreateFlyoutOpen ? (
        <CreateDataSourceFlyout
          onClose={() => setCreateFlyoutOpen(false)}
          onSave={handleCreateDataSourceSave}
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
