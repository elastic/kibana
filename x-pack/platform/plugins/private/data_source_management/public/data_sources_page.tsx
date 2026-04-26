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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPageSection,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';
import type { DataSourceType } from '../common/datasource_types';
import type { DataSetListItem } from '../common/sample_data_sets_client';
import { SampleDataSetsClient } from '../common/sample_data_sets_client';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import { SampleDataSourcesClient } from '../common/sample_data_sources_client';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { getDataSourceTypeLabel } from './get_data_source_type_label';

export interface DataSourcesPageProps {
  pageTitle: string;
}

export const DataSourcesPage: FunctionComponent<DataSourcesPageProps> = ({ pageTitle }) => {
  const dataClient = useMemo(() => new SampleDataSourcesClient(), []);
  const dataSetsClient = useMemo(() => new SampleDataSetsClient(), []);
  const [items, setItems] = useState<DataSourceListItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<DataSourceListItem[]>([]);
  const [dataSetItems, setDataSetItems] = useState<DataSetListItem[]>([]);
  const [isCreateFlyoutOpen, setCreateFlyoutOpen] = useState(false);

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
      const nextItems = await dataSetsClient.get();
      if (!cancelled) {
        setDataSetItems(nextItems);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSetsClient]);

  const handleCreateDataSourceSave = useCallback(
    async (values: {
      name: string;
      description: string;
      type: DataSourceType;
    }): Promise<string | null> => {
      try {
        await dataClient.add(values);
        setItems(await dataClient.get());
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [dataClient]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<DataSourceListItem>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.table.columnName', {
          defaultMessage: 'Name',
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
        render: (value: DataSourceListItem['type']) => getDataSourceTypeLabel(value),
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

  const dataSetColumns = useMemo<Array<EuiBasicTableColumn<DataSetListItem>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.dataSetsTable.columnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        width: '22%',
        'data-test-subj': 'dataSourceManagementSetsColName',
      },
      {
        field: 'sourceName',
        name: i18n.translate('dataSourceManagement.dataSetsTable.columnSourceName', {
          defaultMessage: 'Source name',
        }),
        sortable: true,
        width: '22%',
        'data-test-subj': 'dataSourceManagementSetsColSourceName',
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
            <EuiInMemoryTable<DataSourceListItem>
              items={items}
              itemId="id"
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
                  <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                    <EuiFlexItem grow={false}>
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
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        color="primary"
                        display="fill"
                        iconType="refresh"
                        aria-label={i18n.translate('dataSourceManagement.refreshButtonAriaLabel', {
                          defaultMessage: 'Refresh',
                        })}
                        data-test-subj="dataSourceManagementRefreshButton"
                        onClick={() => {
                          void (async () => {
                            setItems(await dataClient.get());
                            setSelectedItems([]);
                          })();
                        }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
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
            <EuiInMemoryTable<DataSetListItem>
              items={dataSetItems}
              itemId="id"
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
                      description: { type: 'string' },
                      sourceName: { type: 'string' },
                    },
                  },
                },
                toolsRight: (
                  <EuiButtonIcon
                    color="primary"
                    display="fill"
                    iconType="refresh"
                    aria-label={i18n.translate(
                      'dataSourceManagement.dataSetsRefreshButtonAriaLabel',
                      {
                        defaultMessage: 'Refresh data sets',
                      }
                    )}
                    data-test-subj="dataSourceManagementSetsRefreshButton"
                    onClick={() => {
                      void (async () => {
                        setDataSetItems(await dataSetsClient.get());
                      })();
                    }}
                  />
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
    [columns, dataClient, dataSetColumns, dataSetItems, dataSetsClient, items, selectedItems]
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
    </>
  );
};
