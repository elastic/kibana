/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';

import type { DataSourceWithSecrets } from '../common';
import { LIST_BREADCRUMB, PLUGIN_NAME } from '../common';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { AddDataSetFlyout } from './add_data_set_flyout';
import type { AddDataSetFlyoutPayload } from './add_data_set_flyout';
import {
  DATA_SOURCE_MANAGEMENT_ROUTES,
  getDataSourceDetailPath,
} from './data_source_management_routes';
import { useDataSourceManagementAppContext } from './data_source_management_app_context';
import { getDataSourceTypeLabel } from './get_data_source_type_label';
import { dataSourcePreviewPageStrings } from './data_source_preview_flyout_i18n';

export interface DataSourcesPageProps {
  pageTitle: string;
  /**
   * When true (e.g. `/connect` deep link), open the connect flyout once the page is shown.
   */
  openConnectFlyoutOnMount?: boolean;
}

export const DataSourcesPage: FunctionComponent<DataSourcesPageProps> = ({
  pageTitle,
  openConnectFlyoutOnMount = false,
}) => {
  const history = useHistory();
  const { coreStart, setBreadcrumbs, dataSourcesClient, dataSetsClient } =
    useDataSourceManagementAppContext();
  const { docTitle } = coreStart.chrome;
  const { overlays } = coreStart;

  const [items, setItems] = useState<DataSourceListItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<DataSourceListItem[]>([]);
  const [isConnectFlyoutOpen, setConnectFlyoutOpen] = useState(openConnectFlyoutOnMount);
  const [addDataSetFlyoutSource, setAddDataSetFlyoutSource] = useState<DataSourceListItem | null>(
    null
  );

  useEffect(() => {
    if (openConnectFlyoutOnMount) {
      setConnectFlyoutOpen(true);
    }
  }, [openConnectFlyoutOnMount]);

  const refreshItems = useCallback(async () => {
    setItems(await dataSourcesClient.get());
  }, [dataSourcesClient]);

  const handleConnectFlyoutClose = useCallback(() => {
    setConnectFlyoutOpen(false);
    void refreshItems();
    const { pathname } = history.location;
    if (
      pathname === DATA_SOURCE_MANAGEMENT_ROUTES.connect ||
      pathname.endsWith(DATA_SOURCE_MANAGEMENT_ROUTES.connect)
    ) {
      history.replace(DATA_SOURCE_MANAGEMENT_ROUTES.list);
    }
  }, [history, refreshItems]);

  const handleConnectSave = useCallback(
    async (values: {
      name: string;
      dataSource: Omit<DataSourceWithSecrets, 'id'>;
    }): Promise<string | null> => {
      try {
        await dataSourcesClient.add(values);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [dataSourcesClient]
  );

  useEffect(() => {
    setBreadcrumbs(LIST_BREADCRUMB);
    docTitle.change(PLUGIN_NAME);
    return () => {
      docTitle.reset();
    };
  }, [docTitle, setBreadcrumbs]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextItems = await dataSourcesClient.get();
      if (!cancelled) {
        setItems(nextItems);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSourcesClient]);

  const handleDeleteSourceRow = useCallback(
    (record: DataSourceListItem) => {
      void overlays
        .openConfirm(dataSourcePreviewPageStrings.deleteSourceConfirmMessage(record.name), {
          title: dataSourcePreviewPageStrings.deleteSourceConfirmTitle(),
          confirmButtonText: dataSourcePreviewPageStrings.deleteSourceConfirmButton(),
          cancelButtonText: dataSourcePreviewPageStrings.cancelButton(),
          buttonColor: 'danger',
          'data-test-subj': 'dataSourceManagementDeleteRowConfirmModal',
        })
        .then(async (confirmed) => {
          if (!confirmed) {
            return;
          }
          await dataSetsClient.deleteBySourceName(record.name);
          await dataSourcesClient.delete([record.name]);
          setSelectedItems((prev) => prev.filter((row) => row.id !== record.id));
          void refreshItems();
        });
    },
    [dataSetsClient, dataSourcesClient, overlays, refreshItems]
  );

  const handleCloseAddDataSetFlyout = useCallback(() => {
    setAddDataSetFlyoutSource(null);
  }, []);

  const handleAddDataSetSave = useCallback(
    async (values: AddDataSetFlyoutPayload) => {
      if (!addDataSetFlyoutSource) {
        return 'Unknown error';
      }
      try {
        await dataSetsClient.add({
          sourceName: addDataSetFlyoutSource.name,
          datasetId: values.datasetId,
          resource: values.resource,
          description: values.description,
          partitionDetection: values.partitionDetection,
        });
        void refreshItems();
        setAddDataSetFlyoutSource(null);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [addDataSetFlyoutSource, dataSetsClient, refreshItems]
  );

  const openAddDataSetFlyout = useCallback((record: DataSourceListItem) => {
    setSelectedItems([]);
    setAddDataSetFlyoutSource(record);
  }, []);

  const columns = useMemo<Array<EuiBasicTableColumn<DataSourceListItem>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.table.columnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        width: '24%',
        render: (value: string, record: DataSourceListItem) => (
          <EuiLink
            color="primary"
            data-test-subj={`dataSourceManagementNameLink-${record.id}`}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              history.push(getDataSourceDetailPath(record.id));
            }}
          >
            {value}
          </EuiLink>
        ),
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
      {
        name: i18n.translate('dataSourceManagement.table.columnActions', {
          defaultMessage: 'Actions',
        }),
        width: '120px',
        field: 'id',
        actions: [
          {
            /** EUI disables row actions when any row is selected; keep this control usable and clear selection when opening. */
            render: (item: DataSourceListItem) => {
              const addLabel = i18n.translate('dataSourceManagement.table.addDataSetsAction', {
                defaultMessage: 'Add data sets',
              });
              const addDescription = i18n.translate(
                'dataSourceManagement.table.addDataSetsActionDescription',
                {
                  defaultMessage: 'Add a data set for this data source.',
                }
              );
              return (
                <EuiToolTip content={addDescription} delay="long">
                  <EuiButtonIcon
                    aria-label={addLabel}
                    color="primary"
                    data-test-subj="dataSourceManagementRowAddDataSets"
                    iconType="plusInCircle"
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openAddDataSetFlyout(item);
                    }}
                    onMouseDown={(event: React.MouseEvent) => {
                      event.stopPropagation();
                    }}
                  />
                </EuiToolTip>
              );
            },
          },
          {
            name: i18n.translate('dataSourceManagement.deleteButtonLabel', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate('dataSourceManagement.table.deleteSourceActionDescription', {
              defaultMessage: 'Delete this data source',
            }),
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            onClick: (item: DataSourceListItem, event: React.MouseEvent) => {
              event.stopPropagation();
              event.preventDefault();
              handleDeleteSourceRow(item);
            },
            'data-test-subj': 'dataSourceManagementRowDelete',
          },
        ],
      },
    ],
    [handleDeleteSourceRow, history, openAddDataSetFlyout]
  );

  return (
    <>
      <EuiPageSection paddingSize="m">
        <EuiPageHeader
          bottomBorder
          data-test-subj="dataSourceManagementPageHeader"
          pageTitle={
            <span data-test-subj="dataSourceManagementPageTitle">{pageTitle}</span>
          }
          rightSideItems={[
            <EuiButton
              key="dataSourceManagementCreate"
              color="primary"
              fill
              data-test-subj="dataSourceManagementCreateButton"
              onClick={() => {
                setConnectFlyoutOpen(true);
              }}
            >
              {i18n.translate('dataSourceManagement.connectExternalSourceButton', {
                defaultMessage: 'Connect external source',
              })}
            </EuiButton>,
          ]}
        />
        <EuiSpacer size="l" />
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
                      await dataSourcesClient.delete(selectedItems.map((item) => item.name));
                      setItems(await dataSourcesClient.get());
                      setSelectedItems([]);
                    })();
                  }}
                >
                  {i18n.translate('dataSourceManagement.deleteButtonLabel', {
                    defaultMessage: 'Delete',
                  })}
                </EuiButton>
              ) : undefined,
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
      </EuiPageSection>
      {isConnectFlyoutOpen ? (
        <CreateDataSourceFlyout onClose={handleConnectFlyoutClose} onSave={handleConnectSave} />
      ) : null}
      {addDataSetFlyoutSource ? (
        <AddDataSetFlyout
          key={addDataSetFlyoutSource.id}
          sourceName={addDataSetFlyoutSource.name}
          onClose={handleCloseAddDataSetFlyout}
          onSave={handleAddDataSetSave}
        />
      ) : null}
    </>
  );
};
