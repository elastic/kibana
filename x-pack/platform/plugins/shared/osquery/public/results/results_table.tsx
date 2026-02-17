/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty, isArray, isObject, isEqual, keys, map, reduce } from 'lodash/fp';
import type {
  EuiDataGridSorting,
  EuiDataGridProps,
  EuiDataGridColumn,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
} from '@elastic/eui';
import {
  EuiCallOut,
  EuiCode,
  EuiDataGrid,
  EuiPanel,
  EuiLink,
  EuiSkeletonText,
  EuiProgress,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiFormRow,
  EuiText,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React, { createContext, useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { UnifiedDataTable, DataLoadingState, DataGridDensity } from '@kbn/unified-data-table';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils/types';
import type { UnifiedDataTableSettings } from '@kbn/unified-data-table/src/types';
import type { DataViewField } from '@kbn/data-views-plugin/common';

import { AddToTimelineButton } from '../timelines/add_to_timeline_button';
import type { AddToTimelineHandler } from '../types';
import { useAllResults } from './use_all_results';
import type { ResultEdges } from '../../common/search_strategy';
import { Direction } from '../../common/search_strategy';
import { useKibana } from '../common/lib/kibana';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../common/constants';
import { useActionResults } from '../action_results/use_action_results';
import { generateEmptyDataMessage, PAGINATION_LIMIT_TITLE } from './translations';
import {
  ViewResultsInDiscoverAction,
  ViewResultsInLensAction,
  ViewResultsActionButtonType,
} from '../packs/pack_queries_status_table';
import { PLUGIN_NAME as OSQUERY_PLUGIN_NAME } from '../../common';
import { AddToCaseWrapper } from '../cases/add_to_cases';
import { useIsExperimentalFeatureEnabled } from '../common/experimental_features_context';
import { useOsqueryDataView } from './use_osquery_data_view';
import { transformEdgesToRecords } from './transform_results';
import { getOsqueryCellRenderers } from './cell_renderers';
import { useOsqueryRowActions } from './row_actions';
import { OsqueryResultsFlyout } from './results_flyout';

const DataContext = createContext<ResultEdges>([]);

const PaginationLimitToastContent = () => (
  <>
    <p>
      <FormattedMessage
        id="xpack.osquery.results.paginationLimitDescription"
        defaultMessage="Results limited to first 10,000 documents. To see all results, please use the {viewInDiscoverButton} button."
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        values={{
          viewInDiscoverButton: <strong>&quot;View in Discover&quot;</strong>,
        }}
      />
    </p>
    <p>
      <FormattedMessage
        id="xpack.osquery.results.paginationLimitIndexAccess"
        defaultMessage="Read access to {indexName} index is required."
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        values={{
          indexName: <EuiCode>logs-osquery_manager.results</EuiCode>,
        }}
      />
    </p>
  </>
);

const euiDataGridCss = {
  ':not(.euiDataGrid--fullScreen)': {
    '.euiDataGrid__virtualized': {
      height: '100% !important',
      maxHeight: '500px',
    },
  },
};

const euiProgressCss = {
  marginTop: '-2px',
};

const resultsTableContainerCss = {
  width: '100%',
  maxWidth: '1200px',
};

const searchBarContainerCss = {
  marginBottom: '16px',
};

const CONTROL_COLUMN_IDS = ['openDetails', 'select'];
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500];

export interface ResultsTableComponentProps {
  actionId: string;
  selectedAgent?: string;
  agentIds?: string[];
  ecsMapping?: ECSMapping;
  endDate?: string;
  startDate?: string;
  liveQueryActionId?: string;
  error?: string;
  addToTimeline?: AddToTimelineHandler;
}

const ResultsTableComponent: React.FC<ResultsTableComponentProps> = ({
  actionId,
  agentIds,
  ecsMapping,
  startDate,
  endDate,
  liveQueryActionId,
  error,
  addToTimeline,
}) => {
  const queryHistoryRework = useIsExperimentalFeatureEnabled('queryHistoryRework');

  const [isLive, setIsLive] = useState(true);

  const { data } = useActionResults({
    actionId,
    startDate,
    activePage: 0,
    agentIds,
    limit: 0,
    direction: Direction.asc,
    sortField: '@timestamp',
    isLive,
  });

  const expired = useMemo(() => (!endDate ? false : new Date(endDate) < new Date()), [endDate]);
  const {
    application: { getUrlForApp },
    appName,
    timelines,
    theme,
    uiSettings,
    notifications: { toasts },
    data: dataService,
    analytics,
    i18n: i18nStart,
    uiActions,
  } = useKibana().services;

  const startServices = useMemo(
    () => ({ analytics, i18n: i18nStart, theme }),
    [analytics, i18nStart, theme]
  );

  const storageInstance = useMemo(() => new Storage(localStorage), []);

  const unifiedDataTableServices = useMemo(
    () => ({
      theme,
      fieldFormats: dataService.fieldFormats,
      uiSettings,
      toastNotifications: toasts,
      storage: storageInstance,
      data: dataService,
    }),
    [dataService, storageInstance, theme, toasts, uiSettings]
  );

  const getFleetAppUrl = useCallback(
    (agentId: string) =>
      getUrlForApp('fleet', {
        path: pagePathGetters.agent_details({ agentId })[1],
      }),
    [getUrlForApp]
  );

  const showPaginationLimitToast = useCallback(() => {
    toasts.addWarning({
      title: PAGINATION_LIMIT_TITLE,
      text: toMountPoint(<PaginationLimitToastContent />, { i18n: i18nStart, theme }),
    });
  }, [i18nStart, theme, toasts]);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const onChangeItemsPerPage = useCallback(
    (pageSize: number) => {
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageSize,
        pageIndex: 0,
      }));
    },
    [setPagination]
  );
  const onChangePage = useCallback(
    (pageIndex: any) => {
      if ((pageIndex + 1) * pagination.pageSize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
        showPaginationLimitToast();

        return;
      }

      setPagination((currentPagination) => ({ ...currentPagination, pageIndex }));
    },
    [pagination.pageSize, setPagination, showPaginationLimitToast]
  );

  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([
    {
      id: 'agent.name',
      direction: Direction.asc,
    },
  ]);
  const [columns, setColumns] = useState<EuiDataGridColumn[]>([]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [rowHeight, setRowHeight] = useState<number>(0);
  const [density, setDensity] = useState<DataGridDensity>(DataGridDensity.COMPACT);
  const [gridSettings, setGridSettings] = useState<UnifiedDataTableSettings>({});

  // Server-side KQL filtering state (unified table only)
  const [kuery, setKuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');

  const { data: allResultsData, isLoading } = useAllResults({
    actionId,
    liveQueryActionId,
    startDate,
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    isLive,
    kuery: queryHistoryRework ? kuery || undefined : undefined,
    sort: sortingColumns.map((sortedColumn) => ({
      field: sortedColumn.id,
      direction: sortedColumn.direction as Direction,
    })),
  });

  // Always call hooks unconditionally (React rules of hooks), but skip data view fetch when flag is off
  const { dataView, isLoading: isDataViewLoading } = useOsqueryDataView({
    skip: !queryHistoryRework,
  });

  const columnVisibility = useMemo(
    () => ({ visibleColumns, setVisibleColumns }),
    [visibleColumns, setVisibleColumns]
  );

  const ecsMappingColumns = useMemo(() => keys(ecsMapping || {}), [ecsMapping]);

  // --- Legacy EuiDataGrid path hooks ---
  const renderCellValue: EuiDataGridProps['renderCellValue'] = useMemo(
    () =>
      // eslint-disable-next-line react/display-name
      ({ rowIndex, columnId }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const gridData = useContext(DataContext);

        // @ts-expect-error update types
        const value = gridData[rowIndex % pagination.pageSize]?.fields[columnId];

        if (columnId === 'agent.name') {
          // @ts-expect-error update types
          const agentIdValue = gridData[rowIndex % pagination.pageSize]?.fields['agent.id'];

          return <EuiLink href={getFleetAppUrl(agentIdValue)}>{value}</EuiLink>;
        }

        if (ecsMappingColumns.includes(columnId)) {
          const ecsFieldValue = get(columnId, gridData[rowIndex % pagination.pageSize]?._source);

          if (isArray(ecsFieldValue) || isObject(ecsFieldValue)) {
            try {
              return JSON.stringify(ecsFieldValue, null, 2);
              // eslint-disable-next-line no-empty
            } catch (e) {}
          }

          return ecsFieldValue ?? '-';
        }

        return !isEmpty(value) ? value : '-';
      },
    [ecsMappingColumns, getFleetAppUrl, pagination.pageSize]
  );

  const tableSorting = useMemo(
    () => ({ columns: sortingColumns, onSort: setSortingColumns }),
    [sortingColumns]
  );

  const tablePagination = useMemo(
    () => ({
      ...pagination,
      pageSizeOptions: [10, 50, 100],
      onChangeItemsPerPage,
      onChangePage,
    }),
    [onChangeItemsPerPage, onChangePage, pagination]
  );

  // --- Unified DataTable path hooks ---
  const [accumulatedEdges, setAccumulatedEdges] = useState<ResultEdges>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (!queryHistoryRework) return;
    if (allResultsData?.edges) {
      if (pagination.pageIndex === 0) {
        setAccumulatedEdges(allResultsData.edges);
      } else {
        setAccumulatedEdges((prev: ResultEdges) => [...prev, ...allResultsData.edges]);
      }

      setIsLoadingMore(false);
    }
  }, [queryHistoryRework, allResultsData?.edges, pagination.pageIndex]);

  const rows = useMemo<DataTableRecord[]>(
    () =>
      queryHistoryRework
        ? transformEdgesToRecords({
            edges: accumulatedEdges ?? [],
            ecsMapping,
          })
        : [],
    [queryHistoryRework, accumulatedEdges, ecsMapping]
  );

  const handleFetchMoreRecords = useCallback(() => {
    const totalLoaded = accumulatedEdges.length;
    const total = allResultsData?.total ?? 0;

    if (totalLoaded < total && !isLoadingMore) {
      setIsLoadingMore(true);
      setPagination((prev) => ({
        ...prev,
        pageIndex: prev.pageIndex + 1,
      }));
    }
  }, [accumulatedEdges.length, allResultsData?.total, isLoadingMore]);

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();

  const externalCustomRenderers = useMemo(
    () =>
      getOsqueryCellRenderers({
        getFleetAppUrl,
        ecsMappingColumns,
      }),
    [ecsMappingColumns, getFleetAppUrl]
  );

  const rowAdditionalLeadingControls = useOsqueryRowActions({
    timelines,
    appName: appName ?? '',
    liveQueryActionId,
    agentIds,
    startServices,
  });

  // --- Shared hooks ---
  const ecsMappingConfig = useMemo(() => {
    if (!ecsMapping) return;

    return reduce(
      (acc: Record<string, string[]>, [key, value]) => {
        if (value?.field) {
          acc[value?.field] = [...(acc[value?.field] ?? []), key];
        }

        return acc;
      },
      {},
      Object.entries(ecsMapping)
    );
  }, [ecsMapping]);

  const getHeaderDisplay = useCallback(
    (columnName: string) => {
      if (ecsMappingConfig && ecsMappingConfig[columnName]) {
        return (
          <>
            {columnName}{' '}
            <EuiIconTip
              size="s"
              content={
                <>
                  <FormattedMessage
                    id="xpack.osquery.liveQueryResults.table.fieldMappedLabel"
                    defaultMessage="Field is mapped to"
                  />
                  {`:`}
                  <ul>
                    {ecsMappingConfig[columnName].map((fieldName) => (
                      <li key={fieldName}>{fieldName}</li>
                    ))}
                  </ul>
                </>
              }
              type="indexMapping"
            />
          </>
        );
      }
    },
    [ecsMappingConfig]
  );

  useEffect(() => {
    if (!allResultsData?.columns.length) {
      return;
    }

    const fields = ['agent.name', ...ecsMappingColumns.sort(), ...(allResultsData?.columns || [])];

    const newColumns = fields.reduce(
      (acc, fieldName) => {
        const { data: accData, seen } = acc;
        if (fieldName === 'agent.name') {
          if (!seen.has(fieldName)) {
            accData.push({
              id: fieldName,
              displayAsText: i18n.translate(
                'xpack.osquery.liveQueryResults.table.agentColumnTitle',
                {
                  defaultMessage: 'agent',
                }
              ),
              defaultSortDirection: Direction.asc,
            });
            seen.add(fieldName);
          }

          return acc;
        }

        if (ecsMappingColumns.includes(fieldName)) {
          if (!seen.has(fieldName)) {
            accData.push({
              id: fieldName,
              displayAsText: fieldName,
              defaultSortDirection: Direction.asc,
            });
            seen.add(fieldName);
          }

          return acc;
        }

        if (fieldName.startsWith('osquery.')) {
          const displayAsText = fieldName.split('.')[1];
          const hasNumberType = fields.includes(`${fieldName}.number`);
          if (!seen.has(displayAsText)) {
            const id = hasNumberType ? fieldName + '.number' : fieldName;
            accData.push({
              id,
              displayAsText,
              display: getHeaderDisplay(displayAsText),
              defaultSortDirection: Direction.asc,
              ...(hasNumberType ? { schema: 'numeric' } : {}),
            });
            seen.add(displayAsText);
          }

          return acc;
        }

        return acc;
      },
      { data: [], seen: new Set<string>() } as { data: EuiDataGridColumn[]; seen: Set<string> }
    ).data;

    if (queryHistoryRework) {
      setVisibleColumns((currentVisibleColumns) => {
        const newVisibleColumns = map('id', newColumns);

        return !isEqual(currentVisibleColumns, newVisibleColumns)
          ? newVisibleColumns
          : currentVisibleColumns;
      });
    } else {
      setColumns((currentColumns) =>
        !isEqual(map('id', currentColumns), map('id', newColumns)) ? newColumns : currentColumns
      );
      setVisibleColumns(map('id', newColumns));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    queryHistoryRework,
    allResultsData?.columns.length,
    ecsMappingColumns,
    getHeaderDisplay,
    allResultsData?.columns,
  ]);

  // --- Legacy EuiDataGrid: leading control columns ---
  const leadingControlColumns: EuiDataGridControlColumn[] = useMemo(() => {
    const edges = allResultsData?.edges;
    if (addToTimeline && edges) {
      return [
        {
          id: 'timeline',
          width: 38,
          headerCellRender: () => null,
          rowCellRender: (actionProps) => {
            const { visibleRowIndex } = actionProps as EuiDataGridCellValueElementProps & {
              visibleRowIndex: number;
            };
            const eventId = edges[visibleRowIndex]?._id;

            return (
              <AddToTimelineButton
                field="_id"
                value={eventId!}
                isIcon={true}
                addToTimeline={addToTimeline}
              />
            );
          },
        },
      ];
    }

    return [];
  }, [addToTimeline, allResultsData?.edges]);

  // --- Legacy EuiDataGrid: toolbar visibility ---
  const toolbarVisibility = useMemo(
    () => ({
      showDisplaySelector: false,
      showFullScreenSelector: appName === OSQUERY_PLUGIN_NAME,
      additionalControls: (
        <>
          <ViewResultsInDiscoverAction
            actionId={actionId}
            buttonType={ViewResultsActionButtonType.button}
            endDate={endDate}
            startDate={startDate}
          />
          <ViewResultsInLensAction
            actionId={actionId}
            buttonType={ViewResultsActionButtonType.button}
            endDate={endDate}
            startDate={startDate}
          />
          <AddToTimelineButton field="action_id" value={actionId} addToTimeline={addToTimeline} />
          {liveQueryActionId && (
            <AddToCaseWrapper actionId={liveQueryActionId} queryId={actionId} agentIds={agentIds} />
          )}
        </>
      ),
    }),
    [actionId, addToTimeline, agentIds, appName, endDate, liveQueryActionId, startDate]
  );

  // --- Unified DataTable: additional controls ---
  const externalAdditionalControls = useMemo(
    () => (
      <>
        <ViewResultsInDiscoverAction
          actionId={actionId}
          buttonType={ViewResultsActionButtonType.button}
          endDate={endDate}
          startDate={startDate}
        />
        <ViewResultsInLensAction
          actionId={actionId}
          buttonType={ViewResultsActionButtonType.button}
          endDate={endDate}
          startDate={startDate}
        />
        <AddToTimelineButton field="action_id" value={actionId} />
        {liveQueryActionId && (
          <AddToCaseWrapper actionId={liveQueryActionId} queryId={actionId} agentIds={agentIds} />
        )}
      </>
    ),
    [actionId, agentIds, endDate, liveQueryActionId, startDate]
  );

  // --- Unified DataTable: handlers ---
  const handleSort = useCallback((newSort: string[][]) => {
    setSortingColumns(
      newSort.map(([id, direction]) => ({
        id,
        direction: direction as 'asc' | 'desc',
      }))
    );
  }, []);

  const handleSetColumns = useCallback((newColumns: string[], _hideTimeColumn: boolean) => {
    setVisibleColumns(newColumns);
  }, []);

  const handleUpdatePageIndex = useCallback((pageIndex: number) => {
    setPagination((prev) => ({ ...prev, pageIndex }));
  }, []);

  const handleUpdateRowHeight = useCallback((newRowHeight: number) => {
    setRowHeight(newRowHeight);
  }, []);

  const handleUpdateDensity = useCallback((newDensity: DataGridDensity) => {
    setDensity(newDensity);
  }, []);

  const handleResize = useCallback(
    (colSettings: { columnId: string; width: number | undefined }) => {
      setGridSettings((prev) => ({
        ...prev,
        columns: {
          ...prev.columns,
          [colSettings.columnId]: {
            ...prev.columns?.[colSettings.columnId],
            width: colSettings.width,
          },
        },
      }));
    },
    []
  );

  // Search bar handlers for server-side filtering (unified table only)
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    setKuery(searchInput);
    // Reset pagination and accumulated edges when filter changes
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setAccumulatedEdges([]);
  }, [searchInput]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearchSubmit();
      }
    },
    [handleSearchSubmit]
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setKuery('');
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setAccumulatedEdges([]);
  }, []);

  // Cell action filter handler for server-side filtering (unified table only)
  const handleFilter = useCallback(
    (field: DataViewField, values: unknown, operation: '+' | '-') => {
      const fieldName = field.name;
      const value = Array.isArray(values) ? values[0] : values;
      const escapedValue =
        typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : String(value);

      let newFilter: string;
      if (operation === '+') {
        newFilter = `${fieldName}: ${escapedValue}`;
      } else {
        newFilter = `NOT ${fieldName}: ${escapedValue}`;
      }

      // Append to existing kuery or set as new
      const updatedKuery = kuery ? `${kuery} AND ${newFilter}` : newFilter;

      setSearchInput(updatedKuery);
      setKuery(updatedKuery);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      setAccumulatedEdges([]);

      toasts.addSuccess({
        title: i18n.translate('xpack.osquery.resultsTable.filterApplied', {
          defaultMessage: 'Filter applied',
        }),
        text:
          operation === '+'
            ? i18n.translate('xpack.osquery.resultsTable.filterForApplied', {
                defaultMessage: 'Filtering for {field}: {value}',
                values: { field: fieldName, value: String(value) },
              })
            : i18n.translate('xpack.osquery.resultsTable.filterOutApplied', {
                defaultMessage: 'Filtering out {field}: {value}',
                values: { field: fieldName, value: String(value) },
              }),
      });
    },
    [kuery, toasts]
  );

  const handleCloseFlyout = useCallback(() => {
    setExpandedDoc(undefined);
  }, []);

  const renderDocumentView = useCallback(
    (
      hit: DataTableRecord,
      displayedRows: DataTableRecord[],
      displayedColumns: string[],
      customColumnsMeta?: DataTableColumnsMeta
    ) => {
      if (!dataView) return undefined;

      return (
        <OsqueryResultsFlyout
          hit={hit}
          hits={displayedRows}
          dataView={dataView}
          columns={displayedColumns}
          columnsMeta={customColumnsMeta}
          onClose={handleCloseFlyout}
          setExpandedDoc={setExpandedDoc}
          toastNotifications={toasts}
        />
      );
    },
    [dataView, handleCloseFlyout, toasts]
  );

  useEffect(
    () =>
      setIsLive(() => {
        if (!agentIds?.length || expired || error) return false;

        return !!(
          data.aggregations.totalResponded !== agentIds?.length ||
          allResultsData?.total !== data.aggregations?.totalRowCount ||
          (allResultsData?.total && !allResultsData?.edges.length)
        );
      }),
    [
      agentIds?.length,
      data.aggregations,
      allResultsData?.edges.length,
      allResultsData?.total,
      error,
      expired,
    ]
  );

  if (queryHistoryRework) {
    // --- New UnifiedDataTable path ---
    if (isLoading || isDataViewLoading) {
      return <EuiSkeletonText lines={5} />;
    }

    if (!dataView) {
      return (
        <EuiPanel hasShadow={false} data-test-subj="osqueryResultsPanel">
          <EuiCallOut
            announceOnMount={false}
            title={i18n.translate('xpack.osquery.resultsTable.dataViewError', {
              defaultMessage: 'Unable to load data view for results',
            })}
            color="warning"
          />
        </EuiPanel>
      );
    }

    return (
      <>
        {isLive && <EuiProgress color="primary" size="xs" css={euiProgressCss} />}

        {!allResultsData?.edges.length ? (
          <EuiPanel hasShadow={false} data-test-subj="osqueryResultsPanel">
            <EuiCallOut
              announceOnMount
              title={generateEmptyDataMessage(data?.aggregations.totalResponded ?? 0)}
            />
          </EuiPanel>
        ) : (
          <div css={resultsTableContainerCss}>
            {/* KQL Search Bar for server-side filtering */}
            <div css={searchBarContainerCss}>
              <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate('xpack.osquery.resultsTable.searchLabel', {
                      defaultMessage: 'Filter results (KQL)',
                    })}
                    helpText={
                      <EuiText size="xs" color="subdued">
                        <FormattedMessage
                          id="xpack.osquery.resultsTable.searchHelpText"
                          defaultMessage='Filter all {total} results. Example: agent.name: "my-agent" OR osquery.pid: 1234'
                          values={{ total: allResultsData?.total ?? 0 }}
                        />
                      </EuiText>
                    }
                    fullWidth
                  >
                    <EuiFieldSearch
                      placeholder={i18n.translate('xpack.osquery.resultsTable.searchPlaceholder', {
                        defaultMessage: 'Enter KQL filter...',
                      })}
                      value={searchInput}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      onSearch={handleSearchSubmit}
                      isClearable={!!searchInput}
                      aria-label={i18n.translate('xpack.osquery.resultsTable.searchAriaLabel', {
                        defaultMessage: 'Filter results using KQL',
                      })}
                      fullWidth
                      data-test-subj="osqueryResultsKqlSearch"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              {kuery && (
                <EuiFlexGroup gutterSize="xs" alignItems="center" css={{ marginTop: '8px' }}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="xpack.osquery.resultsTable.activeFilter"
                        defaultMessage="Active filter:"
                      />
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      color="hollow"
                      iconType="cross"
                      iconSide="right"
                      iconOnClick={handleClearSearch}
                      iconOnClickAriaLabel={i18n.translate(
                        'xpack.osquery.resultsTable.clearFilterAriaLabel',
                        { defaultMessage: 'Clear filter' }
                      )}
                      data-test-subj="osqueryResultsClearFilter"
                    >
                      {kuery}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </div>

            <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
              <UnifiedDataTable
                ariaLabelledBy="osquery-results"
                data-test-subj="osqueryResultsTable"
                dataView={dataView}
                columns={visibleColumns}
                rows={rows}
                loadingState={
                  isLoading
                    ? DataLoadingState.loading
                    : isLoadingMore
                    ? DataLoadingState.loadingMore
                    : DataLoadingState.loaded
                }
                onFetchMoreRecords={handleFetchMoreRecords}
                expandedDoc={expandedDoc}
                setExpandedDoc={setExpandedDoc}
                renderDocumentView={renderDocumentView}
                rowAdditionalLeadingControls={rowAdditionalLeadingControls}
                externalCustomRenderers={externalCustomRenderers}
                externalAdditionalControls={externalAdditionalControls}
                sort={sortingColumns.map((col) => [col.id, col.direction])}
                onSort={handleSort}
                onSetColumns={handleSetColumns}
                onResize={handleResize}
                settings={gridSettings}
                showTimeCol={false}
                showFullScreenButton={appName === OSQUERY_PLUGIN_NAME}
                showColumnTokens
                canDragAndDropColumns
                isSortEnabled
                isPaginationEnabled
                rowsPerPageState={pagination.pageSize}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                onUpdateRowsPerPage={onChangeItemsPerPage}
                onUpdatePageIndex={handleUpdatePageIndex}
                rowHeightState={rowHeight}
                onUpdateRowHeight={handleUpdateRowHeight}
                dataGridDensityState={density}
                onUpdateDataGridDensity={handleUpdateDensity}
                sampleSizeState={rows.length}
                totalHits={allResultsData?.total}
                services={unifiedDataTableServices}
                consumer="osquery"
                enableInTableSearch
                enableComparisonMode
                controlColumnIds={CONTROL_COLUMN_IDS}
                onFilter={handleFilter}
              />
            </CellActionsProvider>
          </div>
        )}
      </>
    );
  }

  // --- Legacy EuiDataGrid path ---
  if (isLoading) {
    return <EuiSkeletonText lines={5} />;
  }

  return (
    <>
      {isLive && <EuiProgress color="primary" size="xs" css={euiProgressCss} />}

      {!allResultsData?.edges.length ? (
        <EuiPanel hasShadow={false} data-test-subj={'osqueryResultsPanel'}>
          <EuiCallOut
            announceOnMount
            title={generateEmptyDataMessage(data?.aggregations.totalResponded ?? 0)}
          />
        </EuiPanel>
      ) : (
        <DataContext.Provider value={allResultsData?.edges}>
          <div css={resultsTableContainerCss}>
            <EuiDataGrid
              css={euiDataGridCss}
              data-test-subj="osqueryResultsTable"
              aria-label="Osquery results"
              columns={columns}
              columnVisibility={columnVisibility}
              rowCount={allResultsData?.total ?? 0}
              renderCellValue={renderCellValue}
              leadingControlColumns={leadingControlColumns}
              sorting={tableSorting}
              pagination={tablePagination}
              toolbarVisibility={toolbarVisibility}
            />
          </div>
        </DataContext.Provider>
      )}
    </>
  );
};

export const ResultsTable = React.memo(ResultsTableComponent);
