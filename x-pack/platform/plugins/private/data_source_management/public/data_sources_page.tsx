/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonGroup,
  type EuiButtonGroupOptionProps,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiInMemoryTable,
  EuiLink,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import type { DataSourceType, DataSourceWithSecrets } from '../common';
import { LIST_BREADCRUMB, PLUGIN_NAME } from '../common';
import type {
  DataSourceListItem,
  DataSourceConnectionStatus,
} from '../common/sample_data_sources_client';
import type { SampleDataSetsClient } from '../common/sample_data_sets_client';
import type { SampleDataSourcesClient } from '../common/sample_data_sources_client';
import type { DataSetListItem } from '../common/sample_data_sets_client';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { CreateCloudSourceFlyout } from './create_cloud_source_flyout';
import { EditDataSourceFlyout } from './edit_data_source_flyout';
import { AddDataSetFlyout } from './add_data_set_flyout';
import type { AddDataSetFlyoutPayload } from './add_data_set_flyout';
import {
  DATA_SOURCE_MANAGEMENT_LIST_QUERY_KEYS,
  DATA_SOURCE_MANAGEMENT_ROUTES,
} from './data_source_management_routes';
import { useDataSourceManagementAppContext } from './data_source_management_app_context';
import { getDataSourceTypeLabel } from './get_data_source_type_label';
import { dataSourcePreviewPageStrings } from './data_source_preview_flyout_i18n';

const TAB_ID_DATA_SETS = 'data_sets_tab';
const TAB_ID_DATA_SOURCES = 'data_sources_tab';

const DATA_SOURCE_STATUS_LABELS: Record<DataSourceConnectionStatus, string> = {
  connected: i18n.translate('dataSourceManagement.table.statusConnected', {
    defaultMessage: 'Connected',
  }),
  disconnected: i18n.translate('dataSourceManagement.table.statusDisconnected', {
    defaultMessage: 'Disconnected',
  }),
};

const renderDataSourceConnectionStatus = (status: DataSourceConnectionStatus) => (
  <EuiHealth
    color={status === 'connected' ? 'success' : 'danger'}
    data-test-subj={`dataSourceManagementStatus-${status}`}
  >
    {DATA_SOURCE_STATUS_LABELS[status]}
  </EuiHealth>
);

/** Renders beside global chrome breadcrumbs via `chrome.setBreadcrumbsAppendExtension`. */
const PrototypeCatalogChromeToggle: FunctionComponent<{
  mode: 'sample' | 'empty';
  options: Array<EuiButtonGroupOptionProps>;
  onChange: (id: string) => void;
}> = ({ mode, options, onChange }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css({
        flexShrink: 0,
        marginInlineStart: euiTheme.size.m,
      })}
      data-test-subj="dataSourceManagementPrototypeCatalogToggleChrome"
    >
      <EuiButtonGroup
        buttonSize="compressed"
        color="primary"
        legend={i18n.translate('dataSourceManagement.prototype.catalogToggleLegend', {
          defaultMessage: 'Prototype catalog preview',
        })}
        options={options}
        idSelected={mode === 'empty' ? 'prototype_empty' : 'prototype_sample'}
        onChange={onChange}
        data-test-subj="dataSourceManagementPrototypeCatalogToggle"
      />
    </div>
  );
};

type AddDataSetFlyoutOpenState =
  | { mode: 'closed' }
  | { mode: 'preset'; source: DataSourceListItem }
  | { mode: 'chooseSource' }
  | { mode: 'edit'; record: DataSetListItem };

type DataSetTableRow = DataSetListItem & { type?: DataSourceType };

interface DataSourcesTabPanelProps {
  items: DataSourceListItem[];
  columns: Array<EuiBasicTableColumn<DataSourceListItem>>;
  selectedSources: DataSourceListItem[];
  setSelectedSources: React.Dispatch<React.SetStateAction<DataSourceListItem[]>>;
  dataSourcesClient: SampleDataSourcesClient;
  dataSetsClient: SampleDataSetsClient;
  onRefreshSourcesAndSets: () => Promise<void>;
  modificationsAllowed: boolean;
  onOpenCloudSourceFlyout: () => void;
}

const DataSourcesTabPanel: FunctionComponent<DataSourcesTabPanelProps> = ({
  items,
  columns,
  selectedSources,
  setSelectedSources,
  dataSourcesClient,
  dataSetsClient,
  onRefreshSourcesAndSets,
  modificationsAllowed,
  onOpenCloudSourceFlyout,
}) => {
  const connectButton = modificationsAllowed ? (
    <EuiButton
      color="primary"
      fill
      data-test-subj="dataSourceManagementCreateButton"
      onClick={onOpenCloudSourceFlyout}
    >
      {i18n.translate('dataSourceManagement.connectExternalSourceButton', {
        defaultMessage: 'Connect external source',
      })}
    </EuiButton>
  ) : undefined;

  return (
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
                status: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
          toolsLeft:
            modificationsAllowed && selectedSources.length > 0 ? (
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
          toolsRight: connectButton,
        }}
        rowHeader="name"
        selection={
          modificationsAllowed
            ? {
                selected: selectedSources,
                onSelectionChange: setSelectedSources,
              }
            : undefined
        }
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
        tableLayout="fixed"
        responsiveBreakpoint={false}
      />
    </>
  );
};

interface DataSetsTabPanelProps {
  dataSetsWithJoinedType: DataSetTableRow[];
  columns: Array<EuiBasicTableColumn<DataSetTableRow>>;
  selectedDataSets: DataSetTableRow[];
  setSelectedDataSets: React.Dispatch<React.SetStateAction<DataSetTableRow[]>>;
  dataSetsSearchQuery: string;
  onDataSetsSearchQueryChange: (nextQuery: string) => void;
  /** Names for the search bar field filter (registered sources and any orphan `sourceName` values from data sets). */
  dataSourceFilterOptions: ReadonlyArray<{ value: string }>;
  modificationsAllowed: boolean;
  /** When false, the catalog has no data sets; show the empty prompt. */
  hasAnyDataSetsInCatalog: boolean;
  addDataSetButtonLabel: string;
  onOpenAddDataSetFlyout: () => void;
  onBulkDeleteSelectedDataSets: () => void;
}

const DataSetsTabPanel: FunctionComponent<DataSetsTabPanelProps> = ({
  dataSetsWithJoinedType,
  columns,
  selectedDataSets,
  setSelectedDataSets,
  dataSetsSearchQuery,
  onDataSetsSearchQueryChange,
  dataSourceFilterOptions,
  modificationsAllowed,
  hasAnyDataSetsInCatalog,
  addDataSetButtonLabel,
  onOpenAddDataSetFlyout,
  onBulkDeleteSelectedDataSets,
}) => {
  const addDataSetButton = (
    <EuiButton
      color="primary"
      fill
      data-test-subj="dataSourceManagementSetsAddButton"
      onClick={onOpenAddDataSetFlyout}
    >
      {addDataSetButtonLabel}
    </EuiButton>
  );

  const dataSetsTabNoItemsMessage = useMemo(() => {
    if (hasAnyDataSetsInCatalog) {
      return i18n.translate('dataSourceManagement.datasetsTab.noFilteredItemsMessage', {
        defaultMessage: 'No datasets found',
      });
    }
    return (
      <FormattedMessage
        id="dataSourceManagement.datasetsTab.emptyCatalogPromptMessage"
        defaultMessage="You don't have any datasets yet."
      />
    );
  }, [hasAnyDataSetsInCatalog]);

  const dataSetsSearchFilters = useMemo(
    () =>
      dataSourceFilterOptions.length === 0
        ? undefined
        : [
            {
              type: 'field_value_selection' as const,
              field: 'sourceName',
              name: i18n.translate(
                'dataSourceManagement.datasetsTab.search.dataSourceFilterLabel',
                {
                  defaultMessage: 'Data source',
                }
              ),
              multiSelect: 'or' as const,
              operator: 'exact' as const,
              options: dataSourceFilterOptions,
              autoSortOptions: false,
            },
          ],
    [dataSourceFilterOptions]
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
              defaultMessage: 'Search datasets…',
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
          filters: dataSetsSearchFilters,
          toolsLeft:
            modificationsAllowed && selectedDataSets.length > 0 ? (
              <EuiButton
                color="danger"
                data-test-subj="dataSourceManagementSetsBulkDeleteButton"
                iconType="trash"
                onClick={onBulkDeleteSelectedDataSets}
              >
                {i18n.translate('dataSourceManagement.deleteButtonLabel', {
                  defaultMessage: 'Delete',
                })}
              </EuiButton>
            ) : undefined,
          toolsRight: modificationsAllowed ? addDataSetButton : undefined,
          query: dataSetsSearchQuery,
          onChange: ({ queryText, error }) => {
            if (error) {
              return false;
            }
            onDataSetsSearchQueryChange(queryText ?? '');
            return true;
          },
        }}
        sorting
        pagination={{
          pageSizeOptions: [5, 10, 20],
          initialPageSize: 10,
        }}
        selection={
          modificationsAllowed
            ? {
                selected: selectedDataSets,
                onSelectionChange: setSelectedDataSets,
              }
            : undefined
        }
        data-test-subj="dataSourceManagementSetsTable"
        tableCaption={i18n.translate('dataSourceManagement.datasetsTab.tableCaption', {
          defaultMessage: 'Datasets',
        })}
        noItemsMessage={dataSetsTabNoItemsMessage}
        tableLayout="fixed"
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
  const location = useLocation();
  const { coreStart, dataSetsClient, dataSourcesClient, modificationsAllowed, setBreadcrumbs } =
    useDataSourceManagementAppContext();
  const { docTitle } = coreStart.chrome;
  const { overlays } = coreStart;

  const [items, setItems] = useState<DataSourceListItem[]>([]);
  const [dataSets, setDataSets] = useState<DataSetListItem[]>([]);
  const [selectedSources, setSelectedSources] = useState<DataSourceListItem[]>([]);
  const [selectedDataSets, setSelectedDataSets] = useState<DataSetTableRow[]>([]);
  const [dataSetsSearchQuery, setDataSetsSearchQuery] = useState('');
  const [selectedTabId, setSelectedTabId] = useState(
    openConnectFlyoutOnMount && modificationsAllowed ? TAB_ID_DATA_SOURCES : TAB_ID_DATA_SETS
  );
  const [isConnectFlyoutOpen, setConnectFlyoutOpen] = useState(
    openConnectFlyoutOnMount && modificationsAllowed
  );
  const [isCloudSourceFlyoutOpen, setCloudSourceFlyoutOpen] = useState(false);
  /** Name of the data source just created via the connect flyout while the add-dataset flyout was open. */
  const [newSourceNameForDataSet, setNewSourceNameForDataSet] = useState<string | undefined>();
  const [addDataSetFlyout, setAddDataSetFlyout] = useState<AddDataSetFlyoutOpenState>({
    mode: 'closed',
  });
  const [editDataSource, setEditDataSource] = useState<DataSourceListItem | null>(null);

  /** Prototype-only toggle: hides sample catalog in the UI without mutating backing clients. */
  const [prototypeCatalogMode, setPrototypeCatalogMode] = useState<'sample' | 'empty'>('sample');

  useEffect(() => {
    if (!modificationsAllowed || !openConnectFlyoutOnMount) {
      return;
    }
    setConnectFlyoutOpen(true);
    setSelectedTabId(TAB_ID_DATA_SOURCES);
  }, [modificationsAllowed, openConnectFlyoutOnMount]);

  useEffect(() => {
    if (modificationsAllowed) {
      return;
    }
    setConnectFlyoutOpen(false);
    setCloudSourceFlyoutOpen(false);
    setAddDataSetFlyout({ mode: 'closed' });
    setEditDataSource(null);
    setSelectedSources([]);
    setSelectedDataSets([]);
  }, [modificationsAllowed]);

  const applyFetchedCatalog = useCallback(
    (sources: DataSourceListItem[], sets: DataSetListItem[]) => {
      if (prototypeCatalogMode === 'empty') {
        setItems([]);
        setDataSets([]);
      } else {
        setItems(sources);
        setDataSets(sets);
      }
    },
    [prototypeCatalogMode]
  );

  const refreshSourcesAndSets = useCallback(async () => {
    const [sources, sets] = await Promise.all([dataSourcesClient.get(), dataSetsClient.get()]);
    applyFetchedCatalog(sources, sets);
  }, [applyFetchedCatalog, dataSetsClient, dataSourcesClient]);

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
        if (addDataSetFlyout.mode !== 'closed') {
          setNewSourceNameForDataSet(values.name);
        }
        await refreshSourcesAndSets();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [addDataSetFlyout.mode, dataSourcesClient, refreshSourcesAndSets]
  );

  const handleCloudSourceFlyoutClose = useCallback(() => {
    setCloudSourceFlyoutOpen(false);
    void refreshSourcesAndSets();
  }, [refreshSourcesAndSets]);

  const handleCloudSourceSave = useCallback(
    async (values: {
      name: string;
      dataSource: Omit<DataSourceWithSecrets, 'id'>;
    }): Promise<string | null> => {
      try {
        await dataSourcesClient.add(values);
        if (addDataSetFlyout.mode !== 'closed') {
          setNewSourceNameForDataSet(values.name);
        }
        await refreshSourcesAndSets();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [addDataSetFlyout.mode, dataSourcesClient, refreshSourcesAndSets]
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
      applyFetchedCatalog(sources, sets);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyFetchedCatalog, dataSourcesClient, dataSetsClient]);

  const pushFilteredDataSetsView = useCallback(
    (dataSourceName: string) => {
      history.push({
        pathname: DATA_SOURCE_MANAGEMENT_ROUTES.list,
        search: new URLSearchParams({
          [DATA_SOURCE_MANAGEMENT_LIST_QUERY_KEYS.dataSourceName]: dataSourceName,
        }).toString(),
      });
    },
    [history]
  );

  const handleDataSetsSearchQueryChange = useCallback(
    (nextQuery: string) => {
      setDataSetsSearchQuery(nextQuery);
      const params = new URLSearchParams(history.location.search);
      params.delete(DATA_SOURCE_MANAGEMENT_LIST_QUERY_KEYS.dataSourceId);
      if (nextQuery !== '') {
        params.set(DATA_SOURCE_MANAGEMENT_LIST_QUERY_KEYS.dataSourceName, nextQuery);
      } else {
        params.delete(DATA_SOURCE_MANAGEMENT_LIST_QUERY_KEYS.dataSourceName);
      }
      const search = params.toString();
      history.replace({ pathname: history.location.pathname, search });
    },
    [history]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nameParam = params.get(DATA_SOURCE_MANAGEMENT_LIST_QUERY_KEYS.dataSourceName);
    const idParam = params.get(DATA_SOURCE_MANAGEMENT_LIST_QUERY_KEYS.dataSourceId);
    if (!nameParam && !idParam) {
      return;
    }
    setSelectedTabId(TAB_ID_DATA_SETS);
    if (nameParam) {
      setDataSetsSearchQuery(nameParam);
      return;
    }
    if (idParam && items.length > 0) {
      const sourceForId = items.find((entry) => entry.id === idParam);
      if (sourceForId) {
        setDataSetsSearchQuery(sourceForId.name);
        const nextSearch = new URLSearchParams(location.search);
        nextSearch.delete(DATA_SOURCE_MANAGEMENT_LIST_QUERY_KEYS.dataSourceId);
        nextSearch.set(DATA_SOURCE_MANAGEMENT_LIST_QUERY_KEYS.dataSourceName, sourceForId.name);
        history.replace({ pathname: location.pathname, search: nextSearch.toString() });
      }
    }
  }, [history, items, location.pathname, location.search]);

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

  const handleTestConnectionRow = useCallback(
    (record: DataSourceListItem) => {
      if (record.status === 'connected') {
        coreStart.notifications.toasts.addSuccess(
          i18n.translate('dataSourceManagement.table.testConnectionSuccess', {
            defaultMessage: 'Successfully connected to "{name}".',
            values: { name: record.name },
          })
        );
        return;
      }
      coreStart.notifications.toasts.addDanger(
        i18n.translate('dataSourceManagement.table.testConnectionFailure', {
          defaultMessage: 'Could not connect to "{name}".',
          values: { name: record.name },
        })
      );
    },
    [coreStart.notifications.toasts]
  );

  const handleCloseAddDataSetFlyout = useCallback(() => {
    setAddDataSetFlyout({ mode: 'closed' });
    setNewSourceNameForDataSet(undefined);
  }, []);

  const handleAddDataSetSave = useCallback(
    async (values: AddDataSetFlyoutPayload) => {
      if (!values.editingSetId && addDataSetFlyout.mode === 'preset') {
        if (values.sourceName !== addDataSetFlyout.source.name) {
          return 'Unknown error';
        }
      }
      try {
        if (values.editingSetId) {
          await dataSetsClient.update(values.editingSetId, {
            resource: values.resource,
            description: values.description,
            partitionDetection: values.partitionDetection,
          });
        } else {
          await dataSetsClient.add({
            sourceName: values.sourceName,
            datasetId: values.datasetId,
            resource: values.resource,
            description: values.description,
            partitionDetection: values.partitionDetection,
          });
        }
        void refreshSourcesAndSets();
        setAddDataSetFlyout({ mode: 'closed' });
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [addDataSetFlyout, dataSetsClient, refreshSourcesAndSets]
  );

  const openEditDataSourceFlyoutFromSourceRow = useCallback((record: DataSourceListItem) => {
    setSelectedSources([]);
    setSelectedDataSets([]);
    setEditDataSource(record);
  }, []);

  const handleCloseEditDataSourceFlyout = useCallback(() => {
    setEditDataSource(null);
  }, []);

  const handleSaveEditDataSourceDescription = useCallback(
    async (description: string) => {
      if (!editDataSource) {
        return;
      }
      await dataSourcesClient.updateDescription(editDataSource.id, description);
      void refreshSourcesAndSets();
      setEditDataSource(null);
    },
    [dataSourcesClient, editDataSource, refreshSourcesAndSets]
  );

  const openAddDataSetFlyoutChooseSource = useCallback(() => {
    setAddDataSetFlyout({ mode: 'chooseSource' });
  }, []);

  const resolvePresetSourceForDataSet = useCallback(
    (record: DataSetListItem): DataSourceListItem =>
      items.find((s) => s.name === record.sourceName) ?? {
        id: `orphan:${record.id}`,
        name: record.sourceName,
        description: '',
        type: 's3',
        status: 'disconnected',
      },
    [items]
  );

  const openEditDataSetFlyout = useCallback((record: DataSetListItem) => {
    setSelectedDataSets([]);
    setAddDataSetFlyout({ mode: 'edit', record });
  }, []);

  const handleBulkDeleteSelectedDataSets = useCallback(() => {
    if (selectedDataSets.length === 0) {
      return;
    }
    void overlays
      .openConfirm(
        i18n.translate('dataSourceManagement.datasetsTab.bulkDeleteConfirmMessage', {
          defaultMessage:
            'Delete {count, plural, one {# selected dataset} other {# selected datasets}}? This cannot be undone.',
          values: { count: selectedDataSets.length },
        }),
        {
          title: i18n.translate('dataSourceManagement.datasetsTab.bulkDeleteConfirmTitle', {
            defaultMessage: 'Delete selected datasets',
          }),
          confirmButtonText: i18n.translate('dataSourceManagement.deleteButtonLabel', {
            defaultMessage: 'Delete',
          }),
          cancelButtonText: dataSourcePreviewPageStrings.cancelButton(),
          buttonColor: 'danger',
          'data-test-subj': 'dataSourceManagementBulkDeleteDataSetsConfirmModal',
        }
      )
      .then(async (confirmed) => {
        if (!confirmed) {
          return;
        }
        await dataSetsClient.delete(selectedDataSets.map((r) => r.id));
        setSelectedDataSets([]);
        void refreshSourcesAndSets();
      });
  }, [dataSetsClient, overlays, refreshSourcesAndSets, selectedDataSets]);

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
          setSelectedDataSets((prev) => prev.filter((row) => row.id !== record.id));
          void refreshSourcesAndSets();
        });
    },
    [dataSetsClient, overlays, refreshSourcesAndSets]
  );

  const handleDeleteDataSetFromEditFlyout = useCallback(async () => {
    if (addDataSetFlyout.mode !== 'edit') {
      return;
    }
    const record = addDataSetFlyout.record;
    const confirmed = await overlays.openConfirm(
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
        'data-test-subj': 'dataSourceManagementDeleteDataSetFlyoutConfirmModal',
      }
    );
    if (!confirmed) {
      return;
    }
    await dataSetsClient.delete([record.id]);
    setAddDataSetFlyout({ mode: 'closed' });
    setSelectedDataSets((prev) => prev.filter((row) => row.id !== record.id));
    void refreshSourcesAndSets();
  }, [addDataSetFlyout, dataSetsClient, overlays, refreshSourcesAndSets]);

  const handleDeleteDataSourceFromEditFlyout = useCallback(async () => {
    if (!editDataSource) {
      return;
    }
    const record = editDataSource;
    const confirmed = await overlays.openConfirm(
      dataSourcePreviewPageStrings.deleteSourceConfirmMessage(record.name),
      {
        title: dataSourcePreviewPageStrings.deleteSourceConfirmTitle(),
        confirmButtonText: dataSourcePreviewPageStrings.deleteSourceConfirmButton(),
        cancelButtonText: dataSourcePreviewPageStrings.cancelButton(),
        buttonColor: 'danger',
        'data-test-subj': 'dataSourceManagementDeleteSourceFlyoutConfirmModal',
      }
    );
    if (!confirmed) {
      return;
    }
    await dataSetsClient.deleteBySourceName(record.name);
    await dataSourcesClient.delete([record.name]);
    setEditDataSource(null);
    setSelectedSources((prev) => prev.filter((row) => row.id !== record.id));
    void refreshSourcesAndSets();
  }, [dataSetsClient, dataSourcesClient, editDataSource, overlays, refreshSourcesAndSets]);

  const dataSourcesColumns = useMemo<Array<EuiBasicTableColumn<DataSourceListItem>>>(() => {
    const baseColumns: Array<EuiBasicTableColumn<DataSourceListItem>> = [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.table.columnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        width: '20%',
        truncateText: true,
        'data-test-subj': 'dataSourceManagementColName',
      },
      {
        field: 'status',
        name: i18n.translate('dataSourceManagement.table.columnStatus', {
          defaultMessage: 'Status',
        }),
        sortable: true,
        width: '14%',
        render: (status: DataSourceConnectionStatus) => renderDataSourceConnectionStatus(status),
        'data-test-subj': 'dataSourceManagementColStatus',
      },
      {
        name: i18n.translate('dataSourceManagement.table.columnDataSets', {
          defaultMessage: 'Datasets',
        }),
        width: '12%',
        render: (record: DataSourceListItem) => {
          const count = dataSets.filter((d) => d.sourceName === record.name).length;
          return (
            <EuiLink
              color="primary"
              data-test-subj={`dataSourceManagementDataSetsCountLink-${record.id}`}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                pushFilteredDataSetsView(record.name);
              }}
            >
              {count}
            </EuiLink>
          );
        },
        'data-test-subj': 'dataSourceManagementColDataSets',
      },
      {
        field: 'type',
        name: i18n.translate('dataSourceManagement.table.columnType', {
          defaultMessage: 'Type',
        }),
        sortable: true,
        width: '18%',
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
        width: '28%',
        'data-test-subj': 'dataSourceManagementColDescription',
      },
    ];
    if (!modificationsAllowed) {
      return baseColumns;
    }
    return [
      ...baseColumns,
      {
        name: i18n.translate('dataSourceManagement.table.columnActions', {
          defaultMessage: 'Actions',
        }),
        width: '132px',
        minWidth: '132px',
        align: 'right',
        render: (record: DataSourceListItem) => {
          const testLabel = i18n.translate('dataSourceManagement.table.testConnectionAction', {
            defaultMessage: 'Test connection',
          });
          const testDescription = i18n.translate(
            'dataSourceManagement.table.testConnectionActionDescription',
            {
              defaultMessage: 'Verify connectivity to this data source.',
            }
          );
          const editLabel = i18n.translate('dataSourceManagement.table.editSourceAction', {
            defaultMessage: 'Edit data source',
          });
          const editDescription = i18n.translate(
            'dataSourceManagement.table.editSourceActionDescription',
            {
              defaultMessage: 'Edit the description for this data source.',
            }
          );
          const deleteLabel = i18n.translate('dataSourceManagement.deleteButtonLabel', {
            defaultMessage: 'Delete',
          });
          const deleteDescription = i18n.translate(
            'dataSourceManagement.table.deleteSourceActionDescription',
            {
              defaultMessage: 'Delete this data source',
            }
          );
          const stopRowEvent = (event: React.MouseEvent) => {
            event.stopPropagation();
          };

          return (
            <EuiFlexGroup
              gutterSize="xs"
              responsive={false}
              alignItems="center"
              justifyContent="flexEnd"
              data-test-subj={`dataSourceManagementRowActions-${record.id}`}
            >
              <EuiFlexItem grow={false}>
                <EuiToolTip content={testDescription} delay="long">
                  <EuiButtonIcon
                    aria-label={testLabel}
                    color="primary"
                    data-test-subj={`dataSourceManagementRowTestConnection-${record.id}`}
                    iconType="play"
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      stopRowEvent(event);
                      handleTestConnectionRow(record);
                    }}
                    onMouseDown={stopRowEvent}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={editDescription} delay="long">
                  <EuiButtonIcon
                    aria-label={editLabel}
                    color="primary"
                    data-test-subj={`dataSourceManagementRowEditSource-${record.id}`}
                    iconType="pencil"
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      stopRowEvent(event);
                      openEditDataSourceFlyoutFromSourceRow(record);
                    }}
                    onMouseDown={stopRowEvent}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={deleteDescription} delay="long">
                  <EuiButtonIcon
                    aria-label={deleteLabel}
                    color="danger"
                    data-test-subj="dataSourceManagementRowDelete"
                    iconType="trash"
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      stopRowEvent(event);
                      handleDeleteSourceRow(record);
                    }}
                    onMouseDown={stopRowEvent}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
        'data-test-subj': 'dataSourceManagementColActions',
      },
    ];
  }, [
    dataSets,
    handleDeleteSourceRow,
    handleTestConnectionRow,
    modificationsAllowed,
    openEditDataSourceFlyoutFromSourceRow,
    pushFilteredDataSetsView,
  ]);

  const dataSetsColumns = useMemo<Array<EuiBasicTableColumn<DataSetTableRow>>>(() => {
    const baseColumns: Array<EuiBasicTableColumn<DataSetTableRow>> = [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.datasetsTab.columnDataSetId', {
          defaultMessage: 'Dataset ID',
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
        truncateText: true,
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
        field: 'description',
        name: i18n.translate('dataSourceManagement.datasetsTab.columnDescription', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        width: '22%',
        maxWidth: '280px',
        truncateText: true,
        'data-test-subj': 'dataSourceManagementSetsColDescription',
      },
    ];
    if (!modificationsAllowed) {
      return baseColumns;
    }
    return [
      ...baseColumns,
      {
        name: i18n.translate('dataSourceManagement.table.columnActions', {
          defaultMessage: 'Actions',
        }),
        width: '112px',
        minWidth: '112px',
        field: 'id',
        actions: [
          {
            render: (item: DataSetTableRow) => {
              const editLabel = i18n.translate('dataSourceManagement.datasetsTab.editActionLabel', {
                defaultMessage: 'Edit',
              });
              const editHint = i18n.translate(
                'dataSourceManagement.datasetsTab.editActionDescription',
                {
                  defaultMessage: 'Edit resource, partition detection, or description.',
                }
              );
              return (
                <EuiToolTip content={editHint} delay="long">
                  <EuiButtonIcon
                    aria-label={editLabel}
                    color="primary"
                    data-test-subj={`dataSourceManagementSetRowEdit-${item.id}`}
                    iconType="pencil"
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openEditDataSetFlyout(item);
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
  }, [handleDeleteDataSetRow, items, modificationsAllowed, openEditDataSetFlyout]);

  /** Synthetic `type` supports Data sources column sorting/search. */
  const dataSetsWithJoinedType = useMemo((): DataSetTableRow[] => {
    return dataSets.map((row) => ({
      ...row,
      /** Synthetic field for sorting/search (type label string). */
      type: items.find((s) => s.name === row.sourceName)?.type ?? 's3',
    }));
  }, [dataSets, items]);

  const dataSourceFilterOptions = useMemo(() => {
    const names = new Set<string>();
    for (const source of items) {
      names.add(source.name);
    }
    for (const set of dataSets) {
      names.add(set.sourceName);
    }
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name }));
  }, [items, dataSets]);

  const dataSetsTabLabel = i18n.translate('dataSourceManagement.tabs.dataSetsTitle', {
    defaultMessage: 'Datasets',
  });
  const dataSourcesTabLabel = i18n.translate('dataSourceManagement.tabs.dataSourcesTitle', {
    defaultMessage: 'Data sources',
  });
  const pageHeaderDescription = i18n.translate('dataSourceManagement.pageHeaderDescription', {
    defaultMessage:
      'Register external connections and organize them into datasets for use in ES|QL.',
  });
  const addDataSetTableButtonLabel = i18n.translate(
    'dataSourceManagement.datasetsTab.addDataSetButton',
    {
      defaultMessage: 'Add dataset',
    }
  );
  const isDataSourcesTabSelected = selectedTabId === TAB_ID_DATA_SOURCES;

  const prototypeCatalogButtonGroupOptions = useMemo<Array<EuiButtonGroupOptionProps>>(
    () => [
      {
        id: 'prototype_sample',
        label: i18n.translate('dataSourceManagement.prototype.catalogWithData', {
          defaultMessage: 'With sample data',
        }),
        'data-test-subj': 'dataSourceManagementPrototypeCatalogWithData',
      },
      {
        id: 'prototype_empty',
        label: i18n.translate('dataSourceManagement.prototype.catalogEmptyState', {
          defaultMessage: 'Empty state',
        }),
        'data-test-subj': 'dataSourceManagementPrototypeCatalogEmpty',
      },
    ],
    []
  );

  const handlePrototypeCatalogModeChange = useCallback((selectedId: string) => {
    setPrototypeCatalogMode(selectedId === 'prototype_empty' ? 'empty' : 'sample');
    setSelectedSources([]);
    setSelectedDataSets([]);
  }, []);

  useEffect(() => {
    const unregister = coreStart.chrome.setBreadcrumbsAppendExtension({
      order: 10,
      content: (
        <PrototypeCatalogChromeToggle
          mode={prototypeCatalogMode}
          options={prototypeCatalogButtonGroupOptions}
          onChange={handlePrototypeCatalogModeChange}
        />
      ),
    });
    return () => {
      unregister();
    };
  }, [
    coreStart.chrome,
    prototypeCatalogMode,
    prototypeCatalogButtonGroupOptions,
    handlePrototypeCatalogModeChange,
  ]);

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
          description={pageHeaderDescription}
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
            modificationsAllowed={modificationsAllowed}
            selectedSources={selectedSources}
            setSelectedSources={setSelectedSources}
            onOpenCloudSourceFlyout={() => {
              if (modificationsAllowed) {
                setCloudSourceFlyoutOpen(true);
              }
            }}
            onRefreshSourcesAndSets={refreshSourcesAndSets}
          />
        ) : (
          <DataSetsTabPanel
            columns={dataSetsColumns}
            dataSourceFilterOptions={dataSourceFilterOptions}
            dataSetsSearchQuery={dataSetsSearchQuery}
            dataSetsWithJoinedType={dataSetsWithJoinedType}
            modificationsAllowed={modificationsAllowed}
            onDataSetsSearchQueryChange={handleDataSetsSearchQueryChange}
            selectedDataSets={selectedDataSets}
            setSelectedDataSets={setSelectedDataSets}
            hasAnyDataSetsInCatalog={dataSets.length > 0}
            addDataSetButtonLabel={addDataSetTableButtonLabel}
            onOpenAddDataSetFlyout={openAddDataSetFlyoutChooseSource}
            onBulkDeleteSelectedDataSets={handleBulkDeleteSelectedDataSets}
          />
        )}
      </EuiPageSection>
      {isConnectFlyoutOpen && modificationsAllowed ? (
        <CreateDataSourceFlyout onClose={handleConnectFlyoutClose} onSave={handleConnectSave} />
      ) : null}
      {isCloudSourceFlyoutOpen && modificationsAllowed ? (
        <CreateCloudSourceFlyout
          onClose={handleCloudSourceFlyoutClose}
          onSave={handleCloudSourceSave}
        />
      ) : null}
      {modificationsAllowed && editDataSource ? (
        <EditDataSourceFlyout
          key={editDataSource.id}
          source={editDataSource}
          onClose={handleCloseEditDataSourceFlyout}
          onDelete={handleDeleteDataSourceFromEditFlyout}
          onSave={handleSaveEditDataSourceDescription}
        />
      ) : null}
      {modificationsAllowed && addDataSetFlyout.mode !== 'closed' ? (
        <AddDataSetFlyout
          key={
            addDataSetFlyout.mode === 'preset'
              ? addDataSetFlyout.source.id
              : addDataSetFlyout.mode === 'chooseSource'
              ? 'choose-source'
              : addDataSetFlyout.mode === 'edit'
              ? `edit-${addDataSetFlyout.record.id}`
              : 'flyout'
          }
          presetSource={
            addDataSetFlyout.mode === 'preset'
              ? addDataSetFlyout.source
              : addDataSetFlyout.mode === 'edit'
              ? resolvePresetSourceForDataSet(addDataSetFlyout.record)
              : undefined
          }
          sourcesForPicker={addDataSetFlyout.mode === 'chooseSource' ? items : undefined}
          existingEditSet={addDataSetFlyout.mode === 'edit' ? addDataSetFlyout.record : undefined}
          onDeleteExistingSet={
            addDataSetFlyout.mode === 'edit' ? handleDeleteDataSetFromEditFlyout : undefined
          }
          onClose={handleCloseAddDataSetFlyout}
          onSave={handleAddDataSetSave}
          onAddNewSource={
            addDataSetFlyout.mode === 'chooseSource'
              ? () => setCloudSourceFlyoutOpen(true)
              : undefined
          }
          newlyCreatedSourceName={newSourceNameForDataSet}
        />
      ) : null}
    </>
  );
};
