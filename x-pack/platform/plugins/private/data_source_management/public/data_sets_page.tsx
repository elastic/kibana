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
  EuiInMemoryTable,
  EuiLink,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
} from '@elastic/eui';

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

import type { DataSourceWithSecrets } from '../common';
import { LIST_BREADCRUMB, PLUGIN_NAME, registerConnectorFailedMessage } from '../common';
import type { DataSetListItem } from '../common/sample_data_sets_client';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import { AddDataSetFlyout } from './add_data_set_flyout';
import type { AddDataSetFlyoutPayload } from './add_data_set_flyout';
import { ConnectorSettingsFlyout } from './connector_settings_flyout';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { DATA_SOURCE_MANAGEMENT_ROUTES } from './data_source_management_routes';
import { useDataSourceManagementAppContext } from './data_source_management_app_context';
import {
  dataSourcePreviewFlyoutStrings,
  dataSourcePreviewPageStrings,
} from './data_source_preview_flyout_i18n';
import { EditDataSetDescriptionFlyout } from './edit_data_set_description_flyout';
import { editDataSetDescriptionFlyoutStrings } from './edit_data_set_description_flyout_i18n';

export interface DataSetsPageProps {
  pageTitle: string;
  /**
   * When true (e.g. `/connect` deep link), open the connect flyout once the page is shown.
   */
  openConnectFlyoutOnMount?: boolean;
}

export const DataSetsPage: FunctionComponent<DataSetsPageProps> = ({
  pageTitle,
  openConnectFlyoutOnMount = false,
}) => {
  const history = useHistory();
  const { coreStart, setBreadcrumbs, dataSourcesClient, dataSetsClient } =
    useDataSourceManagementAppContext();
  const { docTitle } = coreStart.chrome;
  const { overlays } = coreStart;

  const [sources, setSources] = useState<DataSourceListItem[]>([]);
  const [items, setItems] = useState<DataSetListItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<DataSetListItem[]>([]);
  const [isConnectFlyoutOpen, setConnectFlyoutOpen] = useState(openConnectFlyoutOnMount);
  const [isAddDataSetFlyoutOpen, setAddDataSetFlyoutOpen] = useState(false);
  const [editingDataSet, setEditingDataSet] = useState<DataSetListItem | null>(null);
  const [connectorSettingsSourceId, setConnectorSettingsSourceId] = useState<string | null>(null);

  useEffect(() => {
    if (openConnectFlyoutOnMount) {
      setConnectFlyoutOpen(true);
    }
  }, [openConnectFlyoutOnMount]);

  const refreshAll = useCallback(async () => {
    const [nextSources, nextSets] = await Promise.all([
      dataSourcesClient.get(),
      dataSetsClient.get(),
    ]);
    setSources(nextSources);
    setItems(nextSets);
  }, [dataSourcesClient, dataSetsClient]);

  const handleConnectFlyoutClose = useCallback(() => {
    setConnectFlyoutOpen(false);
    void refreshAll();
    const { pathname } = history.location;
    if (
      pathname === DATA_SOURCE_MANAGEMENT_ROUTES.connect ||
      pathname.endsWith(DATA_SOURCE_MANAGEMENT_ROUTES.connect)
    ) {
      history.replace(DATA_SOURCE_MANAGEMENT_ROUTES.list);
    }
  }, [history, refreshAll]);

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
      const [nextSources, nextSets] = await Promise.all([
        dataSourcesClient.get(),
        dataSetsClient.get(),
      ]);
      if (!cancelled) {
        setSources(nextSources);
        setItems(nextSets);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSourcesClient, dataSetsClient]);

  useEffect(() => {
    setSelectedItems((prev) => prev.filter((item) => items.some((row) => row.id === item.id)));
  }, [items]);

  useEffect(() => {
    if (
      connectorSettingsSourceId &&
      !sources.some((row) => row.id === connectorSettingsSourceId)
    ) {
      setConnectorSettingsSourceId(null);
    }
  }, [connectorSettingsSourceId, sources]);

  const openConnectorSettings = useCallback((sourceId: string) => {
    setSelectedItems([]);
    setAddDataSetFlyoutOpen(false);
    setConnectorSettingsSourceId(sourceId);
  }, []);

  const handleCloseConnectorSettingsFlyout = useCallback(() => {
    setConnectorSettingsSourceId(null);
  }, []);

  const sourceIdByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sources) {
      m.set(s.name, s.id);
    }
    return m;
  }, [sources]);

  const handleDeleteDataSetRow = useCallback(
    (record: DataSetListItem) => {
      void overlays
        .openConfirm(
          i18n.translate('dataSourceManagement.dataSetsPage.deleteDataSetConfirmMessage', {
            defaultMessage: 'Delete “{name}”? You cannot undo this.',
            values: { name: record.name },
          }),
          {
            title: i18n.translate('dataSourceManagement.dataSetsPage.deleteDataSetConfirmTitle', {
              defaultMessage: 'Delete this data set?',
            }),
            confirmButtonText: i18n.translate(
              'dataSourceManagement.dataSetsPage.deleteDataSetConfirmButton',
              {
                defaultMessage: 'Delete',
              }
            ),
            cancelButtonText: dataSourcePreviewPageStrings.cancelButton(),
            buttonColor: 'danger',
            'data-test-subj': 'dataSetsPageDeleteDataSetConfirmModal',
          }
        )
        .then(async (confirmed) => {
          if (!confirmed) {
            return;
          }
          await dataSetsClient.delete([record.id]);
          setSelectedItems((prev) => prev.filter((row) => row.id !== record.id));
          void refreshAll();
        });
    },
    [dataSetsClient, overlays, refreshAll]
  );

  const handleCloseAddDataSetFlyout = useCallback(() => {
    setAddDataSetFlyoutOpen(false);
  }, []);

  const handleCloseEditDescriptionFlyout = useCallback(() => {
    setEditingDataSet(null);
  }, []);

  const handleEditDataSetDescriptionSave = useCallback(
    async (description: string) => {
      if (!editingDataSet) {
        return null;
      }
      try {
        await dataSetsClient.updateDescription(editingDataSet.id, description);
        void refreshAll();
        setEditingDataSet(null);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [dataSetsClient, editingDataSet, refreshAll]
  );

  const handleAddDataSetSave = useCallback(
    async (values: AddDataSetFlyoutPayload) => {
      try {
        await dataSetsClient.add({
          sourceName: values.sourceName,
          datasetId: values.datasetId,
          resource: values.resource,
          description: values.description,
          partitionDetection: values.partitionDetection,
        });
        void refreshAll();
        setAddDataSetFlyoutOpen(false);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [dataSetsClient, refreshAll]
  );

  const handleRegisterConnectorFromFlyout = useCallback(
    async (connector: ActionConnector) => {
      try {
        await dataSourcesClient.addFromKibanaConnector(connector.name);
        await refreshAll();
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : registerConnectorFailedMessage();
        coreStart.notifications.toasts.addDanger(message);
        throw e;
      }
    },
    [coreStart.notifications.toasts, dataSourcesClient, refreshAll]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<DataSetListItem>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.dataSetsPage.columnDataSet', {
          defaultMessage: 'Data set',
        }),
        sortable: true,
        width: '22%',
        truncateText: true,
        'data-test-subj': 'dataSetsPageColDataSet',
      },
      {
        field: 'sourceName',
        name: i18n.translate('dataSourceManagement.dataSetsPage.columnSource', {
          defaultMessage: 'Source',
        }),
        sortable: true,
        width: '20%',
        truncateText: true,
        render: (value: string) => {
          const sourceId = sourceIdByName.get(value);
          if (!sourceId) {
            return value;
          }
          return (
            <EuiLink
              color="primary"
              data-test-subj={`dataSetsPageSourceLink-${sourceId}`}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                openConnectorSettings(sourceId);
              }}
            >
              {value}
            </EuiLink>
          );
        },
        'data-test-subj': 'dataSetsPageColSource',
      },
      {
        field: 'resource',
        name: dataSourcePreviewFlyoutStrings.setsColumnResource(),
        sortable: true,
        width: '26%',
        truncateText: true,
        'data-test-subj': 'dataSetsPageColResource',
      },
      {
        field: 'description',
        name: i18n.translate('dataSourceManagement.dataSetsPage.columnDescription', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        truncateText: true,
        'data-test-subj': 'dataSetsPageColDescription',
      },
      {
        name: i18n.translate('dataSourceManagement.dataSetsPage.columnActions', {
          defaultMessage: 'Actions',
        }),
        width: '120px',
        minWidth: '112px',
        field: 'id',
        actions: [
          {
            name: editDataSetDescriptionFlyoutStrings.editTableActionName(),
            description: editDataSetDescriptionFlyoutStrings.editActionDescription(),
            type: 'icon',
            icon: 'pencil',
            onClick: (item: DataSetListItem, event: React.MouseEvent) => {
              event.stopPropagation();
              event.preventDefault();
              setEditingDataSet(item);
            },
            'data-test-subj': 'dataSetsPageRowEdit',
          },
          {
            name: i18n.translate('dataSourceManagement.deleteButtonLabel', {
              defaultMessage: 'Delete',
            }),
            description: dataSourcePreviewFlyoutStrings.deleteDataSetDescription(),
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            onClick: (item: DataSetListItem, event: React.MouseEvent) => {
              event.stopPropagation();
              event.preventDefault();
              handleDeleteDataSetRow(item);
            },
            'data-test-subj': 'dataSetsPageRowDelete',
          },
        ],
      },
    ],
    [handleDeleteDataSetRow, openConnectorSettings, sourceIdByName]
  );

  const bulkDeleteLabel =
    selectedItems.length > 1
      ? i18n.translate('dataSourceManagement.dataSetsPage.bulkDeleteDataSetsTitle', {
          defaultMessage: 'Delete these data sets?',
        })
      : i18n.translate('dataSourceManagement.dataSetsPage.deleteDataSetConfirmTitle', {
          defaultMessage: 'Delete this data set?',
        });

  const bulkDeleteMessage =
    selectedItems.length > 1
      ? i18n.translate('dataSourceManagement.dataSetsPage.bulkDeleteDataSetsMessage', {
          defaultMessage:
            'Delete {count} data sets? Associated catalog entries in this prototype will be removed. You cannot undo this.',
          values: { count: selectedItems.length },
        })
      : selectedItems[0]
        ? i18n.translate('dataSourceManagement.dataSetsPage.deleteDataSetConfirmMessage', {
            defaultMessage: 'Delete “{name}”? You cannot undo this.',
            values: { name: selectedItems[0].name },
          })
        : '';

  return (
    <>
      <EuiPageSection paddingSize="m">
        {/* EuiPageHeader reverses `rightSideItems` on wider breakpoints; list primary action first so it stays rightmost. */}
        <EuiPageHeader
          bottomBorder
          data-test-subj="dataSetsPageHeader"
          pageTitle={<span data-test-subj="dataSetsPageTitle">{pageTitle}</span>}
          rightSideItems={[
            <EuiButton
              key="dataSetsAdd"
              color="primary"
              fill
              data-test-subj="dataSetsPageAddDataSetButton"
              onClick={() => {
                setSelectedItems([]);
                setConnectorSettingsSourceId(null);
                setAddDataSetFlyoutOpen(true);
              }}
            >
              {dataSourcePreviewFlyoutStrings.addDataSetButton()}
            </EuiButton>,
          ]}
        />
        <EuiSpacer size="l" />
        <EuiInMemoryTable<DataSetListItem>
          items={items}
          itemId="id"
          columns={columns}
          search={{
            box: {
              incremental: true,
              placeholder: i18n.translate('dataSourceManagement.dataSetsPage.searchPlaceholder', {
                defaultMessage: 'Search data sets…',
              }),
              'data-test-subj': 'dataSetsPageSearch',
              schema: {
                fields: {
                  name: { type: 'string' },
                  sourceName: { type: 'string' },
                  resource: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
            toolsLeft:
              selectedItems.length > 0 ? (
                <EuiButton
                  color="danger"
                  data-test-subj="dataSetsPageBulkDeleteButton"
                  iconType="trash"
                  onClick={() => {
                    void overlays
                      .openConfirm(bulkDeleteMessage, {
                        title: bulkDeleteLabel,
                        confirmButtonText: i18n.translate(
                          'dataSourceManagement.dataSetsPage.deleteDataSetConfirmButton',
                          {
                            defaultMessage: 'Delete',
                          }
                        ),
                        cancelButtonText: dataSourcePreviewPageStrings.cancelButton(),
                        buttonColor: 'danger',
                        'data-test-subj': 'dataSetsPageBulkDeleteConfirmModal',
                      })
                      .then(async (confirmed) => {
                        if (!confirmed) {
                          return;
                        }
                        await dataSetsClient.delete(selectedItems.map((row) => row.id));
                        setSelectedItems([]);
                        void refreshAll();
                      });
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
          data-test-subj="dataSetsPageTable"
          tableCaption={i18n.translate('dataSourceManagement.dataSetsPage.tableCaption', {
            defaultMessage: 'Data sets',
          })}
          noItemsMessage={i18n.translate('dataSourceManagement.dataSetsPage.noItems', {
            defaultMessage: 'No data sets found',
          })}
          tableLayout="auto"
          responsiveBreakpoint={false}
          scrollableInline
        />
      </EuiPageSection>
      {isConnectFlyoutOpen ? (
        <CreateDataSourceFlyout onClose={handleConnectFlyoutClose} onSave={handleConnectSave} />
      ) : null}
      {isAddDataSetFlyoutOpen ? (
        <AddDataSetFlyout
          key="list-add-data-set"
          sources={sources}
          onClose={handleCloseAddDataSetFlyout}
          onSave={handleAddDataSetSave}
          onRegisterConnectorFromFlyout={handleRegisterConnectorFromFlyout}
        />
      ) : null}
      {editingDataSet ? (
        <EditDataSetDescriptionFlyout
          key={editingDataSet.id}
          dataSet={editingDataSet}
          onClose={handleCloseEditDescriptionFlyout}
          onSave={handleEditDataSetDescriptionSave}
        />
      ) : null}
      {connectorSettingsSourceId ? (
        <ConnectorSettingsFlyout
          key={connectorSettingsSourceId}
          sourceId={connectorSettingsSourceId}
          sources={sources}
          onClose={handleCloseConnectorSettingsFlyout}
        />
      ) : null}
    </>
  );
};
