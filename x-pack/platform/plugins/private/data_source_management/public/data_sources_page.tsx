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

import type { DataSourceType, DataSourceWithSecrets } from '../common';
import { LIST_BREADCRUMB, PLUGIN_NAME } from '../common';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import type { SampleDataSetsClient } from '../common/sample_data_sets_client';
import type { SampleDataSourcesClient } from '../common/sample_data_sources_client';
import type { DataSetListItem } from '../common/sample_data_sets_client';
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

const TAB_ID_DATA_SETS = 'data_sets_tab';
const TAB_ID_DATA_SOURCES = 'data_sources_tab';

type AddDataSetFlyoutOpenState =
  | { mode: 'closed' }
  | { mode: 'preset'; source: DataSourceListItem }
  | { mode: 'chooseSource' };

type DataSetTableRow = DataSetListItem & { type?: DataSourceType };

interface DataSourcesTabPanelProps {
  items: DataSourceListItem[];
  columns: Array<EuiBasicTableColumn<DataSourceListItem>>;
  selectedSources: DataSourceListItem[];
  setSelectedSources: React.Dispatch<React.SetStateAction<DataSourceListItem[]>>;
  dataSourcesClient: SampleDataSourcesClient;
  dataSetsClient: SampleDataSetsClient;
  onRefreshSourcesAndSets: () => Promise<void>;
  onOpenConnectFlyout: () => void;
}

const DataSourcesTabPanel: FunctionComponent<DataSourcesTabPanelProps> = ({
  items,
  columns,
  selectedSources,
  setSelectedSources,
  dataSourcesClient,
  dataSetsClient,
  onRefreshSourcesAndSets,
  onOpenConnectFlyout,
}) => (
  <>
    <EuiSpacer size="m" />
    <EuiInMemoryTable<DataSourceListItem>
      items={items}
      itemId="id"
      columns={columns}
      search={{
        box: {
          incremental: true,
          placeholder: i18n.translate('dataSourceManagement.search.sourcesPlaceholder', {
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
          selectedSources.length > 0 ? (
            <EuiButton
              color="danger"
              data-test-subj="dataSourceManagementDeleteButton"
              iconType="trash"
              onClick={() => {
                void (async () => {
                  await Promise.all(
                    selectedSources.map((s) => dataSetsClient.deleteBySourceName(s.name))
                  );
                  await dataSourcesClient.delete(selectedSources.map((s) => s.name));
                  setSelectedSources([]);
                  await onRefreshSourcesAndSets();
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
            fill
            data-test-subj="dataSourceManagementCreateButton"
            onClick={onOpenConnectFlyout}
          >
            {i18n.translate('dataSourceManagement.connectExternalSourceButton', {
              defaultMessage: 'Connect external source',
            })}
          </EuiButton>
        ),
      }}
      rowHeader="name"
      selection={{
        selected: selectedSources,
        onSelectionChange: setSelectedSources,
      }}
      sorting
      pagination={{
        pageSizeOptions: [5, 10, 20],
        initialPageSize: 10,
      }}
      data-test-subj="dataSourceManagementTable"
      tableCaption={i18n.translate('dataSourceManagement.table.sourcesCaption', {
        defaultMessage: 'Data sources',
      })}
      noItemsMessage={i18n.translate('dataSourceManagement.table.sourcesNoItems', {
        defaultMessage: 'No data sources found',
      })}
      tableLayout="auto"
      responsiveBreakpoint={false}
    />
  </>
);

interface DataSetsTabPanelProps {
  dataSetsWithJoinedType: DataSetTableRow[];
  columns: Array<EuiBasicTableColumn<DataSetTableRow>>;
  hasDataSources: boolean;
  addDataSetButtonLabel: string;
  addDataSetDisabledTooltip: string;
  onOpenAddDataSetFlyout: () => void;
}

const DataSetsTabPanel: FunctionComponent<DataSetsTabPanelProps> = ({
  dataSetsWithJoinedType,
  columns,
  hasDataSources,
  addDataSetButtonLabel,
  addDataSetDisabledTooltip,
  onOpenAddDataSetFlyout,
}) => {
  const addDataSetButton = (
    <EuiButton
      color="primary"
      fill
      data-test-subj="dataSourceManagementSetsAddButton"
      onClick={onOpenAddDataSetFlyout}
      disabled={!hasDataSources}
    >
      {addDataSetButtonLabel}
    </EuiButton>
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiInMemoryTable<DataSetTableRow>
        items={dataSetsWithJoinedType}
        itemId="id"
        columns={columns}
        search={{
          box: {
            incremental: true,
            placeholder: i18n.translate('dataSourceManagement.datasetsTab.search.placeholder', {
              defaultMessage: 'Search data sets…',
            }),
            'data-test-subj': 'dataSourceManagementSetsSearch',
            schema: {
              fields: {
                name: { type: 'string' },
                sourceName: { type: 'string' },
                type: { type: 'string' },
                resource: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
          toolsRight: hasDataSources ? (
            addDataSetButton
          ) : (
            <EuiToolTip content={addDataSetDisabledTooltip} delay="long" position="bottom">
              <span tabIndex={0}>{addDataSetButton}</span>
            </EuiToolTip>
          ),
        }}
        sorting
        pagination={{
          pageSizeOptions: [5, 10, 20],
          initialPageSize: 10,
        }}
        data-test-subj="dataSourceManagementSetsTable"
        tableCaption={i18n.translate('dataSourceManagement.datasetsTab.tableCaption', {
          defaultMessage: 'Data sets',
        })}
        noItemsMessage={i18n.translate('dataSourceManagement.datasetsTab.noItems', {
          defaultMessage: 'No data sets found',
        })}
        tableLayout="auto"
        responsiveBreakpoint={false}
        rowHeader="name"
      />
    </>
  );
};

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
  const [dataSets, setDataSets] = useState<DataSetListItem[]>([]);
  const [selectedSources, setSelectedSources] = useState<DataSourceListItem[]>([]);
  const [selectedTabId, setSelectedTabId] = useState(
    openConnectFlyoutOnMount ? TAB_ID_DATA_SOURCES : TAB_ID_DATA_SETS
  );
  const [isConnectFlyoutOpen, setConnectFlyoutOpen] = useState(openConnectFlyoutOnMount);
  const [addDataSetFlyout, setAddDataSetFlyout] = useState<AddDataSetFlyoutOpenState>({
    mode: 'closed',
  });

  useEffect(() => {
    if (openConnectFlyoutOnMount) {
      setConnectFlyoutOpen(true);
      setSelectedTabId(TAB_ID_DATA_SOURCES);
    }
  }, [openConnectFlyoutOnMount]);

  const refreshDataSets = useCallback(async () => {
    setDataSets(await dataSetsClient.get());
  }, [dataSetsClient]);

  const refreshSourcesAndSets = useCallback(async () => {
    const [sources, sets] = await Promise.all([dataSourcesClient.get(), dataSetsClient.get()]);
    setItems(sources);
    setDataSets(sets);
  }, [dataSetsClient, dataSourcesClient]);

  const handleConnectFlyoutClose = useCallback(() => {
    setConnectFlyoutOpen(false);
    void refreshSourcesAndSets();
    const { pathname } = history.location;
    if (
      pathname === DATA_SOURCE_MANAGEMENT_ROUTES.connect ||
      pathname.endsWith(DATA_SOURCE_MANAGEMENT_ROUTES.connect)
    ) {
      history.replace(DATA_SOURCE_MANAGEMENT_ROUTES.list);
    }
  }, [history, refreshSourcesAndSets]);

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
      const [sources, sets] = await Promise.all([dataSourcesClient.get(), dataSetsClient.get()]);
      if (cancelled) {
        return;
      }
      setItems(sources);
      setDataSets(sets);
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSourcesClient, dataSetsClient]);

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
          setSelectedSources((prev) => prev.filter((row) => row.id !== record.id));
          void refreshSourcesAndSets();
        });
    },
    [dataSetsClient, dataSourcesClient, overlays, refreshSourcesAndSets]
  );

  const handleCloseAddDataSetFlyout = useCallback(() => {
    setAddDataSetFlyout({ mode: 'closed' });
  }, []);

  const handleAddDataSetSave = useCallback(
    async (values: AddDataSetFlyoutPayload) => {
      if (
        addDataSetFlyout.mode === 'preset' &&
        values.sourceName !== addDataSetFlyout.source.name
      ) {
        return 'Unknown error';
      }
      try {
        await dataSetsClient.add({
          sourceName: values.sourceName,
          datasetId: values.datasetId,
          resource: values.resource,
          description: values.description,
          partitionDetection: values.partitionDetection,
        });
        void refreshSourcesAndSets();
        setAddDataSetFlyout({ mode: 'closed' });
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [addDataSetFlyout, dataSetsClient, refreshSourcesAndSets]
  );

  const openAddDataSetFlyoutFromSourceRow = useCallback((record: DataSourceListItem) => {
    setSelectedSources([]);
    setAddDataSetFlyout({ mode: 'preset', source: record });
  }, []);

  const openAddDataSetFlyoutChooseSource = useCallback(() => {
    setAddDataSetFlyout({ mode: 'chooseSource' });
  }, []);

  const handleDeleteDataSetRow = useCallback(
    (record: DataSetListItem) => {
      void overlays
        .openConfirm(
          i18n.translate('dataSourceManagement.datasetsTab.deleteConfirmMessage', {
            defaultMessage: 'Delete “{name}”? This cannot be undone.',
            values: { name: record.name },
          }),
          {
            title: i18n.translate('dataSourceManagement.datasetsTab.deleteConfirmTitle', {
              defaultMessage: 'Delete data set',
            }),
            confirmButtonText: i18n.translate('dataSourceManagement.deleteButtonLabel', {
              defaultMessage: 'Delete',
            }),
            cancelButtonText: dataSourcePreviewPageStrings.cancelButton(),
            buttonColor: 'danger',
            'data-test-subj': 'dataSourceManagementDeleteDataSetConfirmModal',
          }
        )
        .then(async (confirmed) => {
          if (!confirmed) {
            return;
          }
          await dataSetsClient.delete([record.id]);
          void refreshDataSets();
        });
    },
    [dataSetsClient, overlays, refreshDataSets]
  );

  const sourceDetailIdBySourceName = useMemo(
    () => new Map(items.map((ds) => [ds.name, ds.id])),
    [items]
  );

  const dataSourcesColumns = useMemo<Array<EuiBasicTableColumn<DataSourceListItem>>>(
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
                      openAddDataSetFlyoutFromSourceRow(item);
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
            description: i18n.translate(
              'dataSourceManagement.table.deleteSourceActionDescription',
              {
                defaultMessage: 'Delete this data source',
              }
            ),
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
    [handleDeleteSourceRow, history, openAddDataSetFlyoutFromSourceRow]
  );

  const dataSetsColumns = useMemo<Array<EuiBasicTableColumn<DataSetTableRow>>>(() => {
    return [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.datasetsTab.columnDataSetId', {
          defaultMessage: 'Data set ID',
        }),
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSourceManagementSetsColName',
      },
      {
        field: 'sourceName',
        name: i18n.translate('dataSourceManagement.datasetsTab.columnSource', {
          defaultMessage: 'Data source',
        }),
        sortable: true,
        width: '16%',
        render: (_value: string, record: DataSetTableRow) => {
          const sourceId = sourceDetailIdBySourceName.get(record.sourceName);
          return sourceId ? (
            <EuiLink
              color="primary"
              data-test-subj={`dataSourceManagementSetSourceLink-${record.id}`}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                history.push(getDataSourceDetailPath(sourceId));
              }}
            >
              {record.sourceName}
            </EuiLink>
          ) : (
            record.sourceName
          );
        },
        'data-test-subj': 'dataSourceManagementSetsColSource',
      },
      {
        field: 'type',
        name: i18n.translate('dataSourceManagement.datasetsTab.columnDataSourceType', {
          defaultMessage: 'Data source type',
        }),
        render: (_t: unknown, record: DataSetTableRow) => {
          const type = items.find((s) => s.name === record.sourceName)?.type ?? record.type;
          return type
            ? getDataSourceTypeLabel(type)
            : i18n.translate('dataSourceManagement.datasetsTab.sourceTypeMissing', {
                defaultMessage: 'Unknown',
              });
        },
        sortable: true,
        width: '16%',
        'data-test-subj': 'dataSourceManagementSetsColType',
      },
      {
        field: 'resource',
        name: i18n.translate('dataSourceManagement.datasetsTab.columnResource', {
          defaultMessage: 'Resource',
        }),
        sortable: true,
        width: '20%',
        truncateText: true,
        'data-test-subj': 'dataSourceManagementSetsColResource',
      },
      {
        field: 'partitionDetection',
        name: i18n.translate('dataSourceManagement.datasetsTab.columnPartition', {
          defaultMessage: 'Partition detection',
        }),
        render: (value: DataSetListItem['partitionDetection']) =>
          value === 'hive'
            ? i18n.translate('dataSourceManagement.datasetsTab.partitionHive', {
                defaultMessage: 'Hive partitions',
              })
            : i18n.translate('dataSourceManagement.datasetsTab.partitionNone', {
                defaultMessage: 'None',
              }),
        sortable: true,
        width: '14%',
        'data-test-subj': 'dataSourceManagementSetsColPartition',
      },
      {
        field: 'description',
        name: i18n.translate('dataSourceManagement.datasetsTab.columnDescription', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        truncateText: true,
        'data-test-subj': 'dataSourceManagementSetsColDescription',
      },
      {
        name: i18n.translate('dataSourceManagement.table.columnActions', {
          defaultMessage: 'Actions',
        }),
        width: '64px',
        actions: [
          {
            name: i18n.translate('dataSourceManagement.deleteButtonLabel', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate(
              'dataSourceManagement.datasetsTab.deleteActionDescription',
              {
                defaultMessage: 'Delete this data set',
              }
            ),
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            onClick: (item: DataSetTableRow, event: React.MouseEvent) => {
              event.stopPropagation();
              event.preventDefault();
              handleDeleteDataSetRow(item);
            },
            'data-test-subj': 'dataSourceManagementSetRowDelete',
          },
        ],
      },
    ];
  }, [handleDeleteDataSetRow, history, items, sourceDetailIdBySourceName]);

  /** Synthetic `type` supports Data sources column sorting/search. */
  const dataSetsWithJoinedType = useMemo((): DataSetTableRow[] => {
    return dataSets.map((row) => ({
      ...row,
      /** Synthetic field for sorting/search (type label string). */
      type: items.find((s) => s.name === row.sourceName)?.type ?? 's3',
    }));
  }, [dataSets, items]);

  const dataSetsTabLabel = i18n.translate('dataSourceManagement.tabs.dataSetsTitle', {
    defaultMessage: 'Data sets',
  });
  const dataSourcesTabLabel = i18n.translate('dataSourceManagement.tabs.dataSourcesTitle', {
    defaultMessage: 'Data sources',
  });
  const addDataSetTableButtonLabel = i18n.translate(
    'dataSourceManagement.datasetsTab.addDataSetButton',
    {
      defaultMessage: 'Add data set',
    }
  );
  const addDataSetTableButtonDisabledTooltip = i18n.translate(
    'dataSourceManagement.datasetsTab.addDataSetDisabledTooltip',
    {
      defaultMessage: 'Connect a data source before adding a data set.',
    }
  );

  const isDataSourcesTabSelected = selectedTabId === TAB_ID_DATA_SOURCES;

  const pageHeaderTabs = useMemo(
    () => [
      {
        id: TAB_ID_DATA_SETS,
        label: dataSetsTabLabel,
        'data-test-subj': 'dataSourceManagementTabDataSets',
        isSelected: !isDataSourcesTabSelected,
        onClick: () => {
          setSelectedTabId(TAB_ID_DATA_SETS);
        },
      },
      {
        id: TAB_ID_DATA_SOURCES,
        label: dataSourcesTabLabel,
        'data-test-subj': 'dataSourceManagementTabDataSources',
        isSelected: isDataSourcesTabSelected,
        onClick: () => {
          setSelectedTabId(TAB_ID_DATA_SOURCES);
        },
      },
    ],
    [dataSetsTabLabel, dataSourcesTabLabel, isDataSourcesTabSelected]
  );

  return (
    <>
      <EuiPageSection paddingSize="m">
        <EuiPageHeader
          bottomBorder
          data-test-subj="dataSourceManagementPageHeader"
          pageTitle={<span data-test-subj="dataSourceManagementPageTitle">{pageTitle}</span>}
          tabs={pageHeaderTabs}
          tabsProps={{
            'data-test-subj': 'dataSourceManagementTabs',
          }}
        />
        {isDataSourcesTabSelected ? (
          <DataSourcesTabPanel
            columns={dataSourcesColumns}
            dataSetsClient={dataSetsClient}
            dataSourcesClient={dataSourcesClient}
            items={items}
            selectedSources={selectedSources}
            setSelectedSources={setSelectedSources}
            onOpenConnectFlyout={() => setConnectFlyoutOpen(true)}
            onRefreshSourcesAndSets={refreshSourcesAndSets}
          />
        ) : (
          <DataSetsTabPanel
            columns={dataSetsColumns}
            dataSetsWithJoinedType={dataSetsWithJoinedType}
            hasDataSources={items.length > 0}
            addDataSetButtonLabel={addDataSetTableButtonLabel}
            addDataSetDisabledTooltip={addDataSetTableButtonDisabledTooltip}
            onOpenAddDataSetFlyout={openAddDataSetFlyoutChooseSource}
          />
        )}
      </EuiPageSection>
      {isConnectFlyoutOpen ? (
        <CreateDataSourceFlyout onClose={handleConnectFlyoutClose} onSave={handleConnectSave} />
      ) : null}
      {addDataSetFlyout.mode !== 'closed' ? (
        <AddDataSetFlyout
          key={addDataSetFlyout.mode === 'preset' ? addDataSetFlyout.source.id : 'choose-source'}
          presetSource={addDataSetFlyout.mode === 'preset' ? addDataSetFlyout.source : undefined}
          sourcesForPicker={addDataSetFlyout.mode === 'chooseSource' ? items : undefined}
          onClose={handleCloseAddDataSetFlyout}
          onSave={handleAddDataSetSave}
        />
      ) : null}
    </>
  );
};
