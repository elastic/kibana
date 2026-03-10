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
  EuiTablePagination,
  useEuiTheme,
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
import { FilterStateStore } from '@kbn/es-query';
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
import { transformEdgesToRecords, getNestedOrFlat } from './transform_results';
import { getOsqueryCellRenderers } from './cell_renderers';
import { useOsqueryTrailingColumns } from './row_actions';
import { OsqueryResultsFlyout } from './results_flyout';
import { useResultsFiltering } from './use_results_filtering';
import { useLogsDataView } from '../common/hooks/use_logs_data_view';

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
  display: 'flex' as const,
  flexDirection: 'column' as const,
  flex: '1 1 auto',
  minHeight: 0,
  height: '100%',
};

const unifiedTableWrapperCss = {
  flex: '1 1 auto',
  minHeight: 0,
};

const gridStyleOverride = {
  border: 'all' as const,
  header: 'shade' as const,
  stripes: false,
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
  const { euiTheme } = useEuiTheme();

  const searchBarWrapperCss = useMemo(
    () => ({
      padding: '16px',
      backgroundColor: euiTheme.colors.body,
    }),
    [euiTheme.colors.body]
  );

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
    unifiedSearch,
    discover,
    chrome,
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
    (pageIndex: number) => {
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
  const [hasUserSetColumns, setHasUserSetColumns] = useState(false);
  const [rowHeight, setRowHeight] = useState<number>(0);
  const [density, setDensity] = useState<DataGridDensity>(DataGridDensity.EXPANDED);
  const [gridSettings, setGridSettings] = useState<UnifiedDataTableSettings>({});

  const ecsMappingColumns = useMemo(() => keys(ecsMapping || {}), [ecsMapping]);

  // Always call hooks unconditionally (React rules of hooks), but skip data view fetch when flag is off
  const { dataView, isLoading: isDataViewLoading } = useOsqueryDataView({
    skip: !queryHistoryRework,
  });

  const resetFilterPagination = useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const {
    query,
    filters,
    kuery,
    filtersForSuggestions,
    handleQuerySubmit,
    handleFiltersUpdated,
    handleFilter,
  } = useResultsFiltering(
    {
      enabled: queryHistoryRework,
      dataView,
      actionId,
    },
    resetFilterPagination
  );

  const { data: allResultsData, isLoading } = useAllResults({
    actionId,
    liveQueryActionId,
    startDate,
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    isLive,
    kuery,
    sort: sortingColumns.map((sortedColumn) => ({
      field: sortedColumn.id,
      direction: sortedColumn.direction as Direction,
    })),
  });

  const columnVisibility = useMemo(
    () => ({ visibleColumns, setVisibleColumns }),
    [visibleColumns, setVisibleColumns]
  );

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
  // Server-side pagination: each page change fetches fresh data from the server.
  // No accumulated edges - rows always reflect the current page only.
  const rows = useMemo<DataTableRecord[]>(
    () =>
      queryHistoryRework
        ? transformEdgesToRecords({
            edges: allResultsData?.edges ?? [],
            ecsMapping,
          })
        : [],
    [queryHistoryRework, allResultsData?.edges, ecsMapping]
  );

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();

  const externalCustomRenderers = useMemo(
    () =>
      getOsqueryCellRenderers({
        getFleetAppUrl,
        ecsMappingColumns,
      }),
    [ecsMappingColumns, getFleetAppUrl]
  );

  // Hoist per-row hooks to table level: call once instead of per-row
  const { data: logsDataView } = useLogsDataView({
    skip: !queryHistoryRework || !actionId,
    checkOnly: true,
  });

  const locator = discover?.locator;
  const [discoverUrl, setDiscoverUrl] = useState<string>('');

  useEffect(() => {
    const getDiscoverUrl = async () => {
      if (!locator || !logsDataView) return;

      const newUrl = await locator.getUrl({
        indexPatternId: logsDataView.id,
        filters: [
          {
            meta: {
              index: logsDataView.id,
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'action_id',
              params: { query: actionId },
            },
            query: { match_phrase: { action_id: actionId } },
            $state: { store: FilterStateStore.APP_STATE },
          },
        ],
        refreshInterval: { pause: true, value: 0 },
        timeRange:
          startDate && endDate
            ? { to: endDate, from: startDate, mode: 'absolute' }
            : { to: 'now', from: 'now-1d', mode: 'relative' },
      });
      setDiscoverUrl(newUrl);
    };

    getDiscoverUrl();
  }, [actionId, endDate, startDate, locator, logsDataView]);

  const trailingColumns = useOsqueryTrailingColumns({
    timelines,
    appName: appName ?? '',
    liveQueryActionId,
    agentIds,
    actionId,
    endDate,
    startDate,
    startServices,
    rows,
    logsDataView,
    discoverUrl,
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

    const allColumnIds = map('id', newColumns);

    if (queryHistoryRework) {
      if (!hasUserSetColumns) {
        // Only include ECS columns that have actual data in at least one row
        const edges = allResultsData?.edges ?? [];
        const ecsColumnsWithData = ecsMappingColumns.filter((col) => {
          if (!allColumnIds.includes(col)) return false;

          return edges.some((edge) => {
            const value = getNestedOrFlat(col, edge._source);

            return value !== undefined && value !== null && value !== '';
          });
        });

        const osqueryColumns = allColumnIds.filter(
          (col) => col !== 'agent.name' && !ecsMappingColumns.includes(col)
        );

        const defaultVisibleColumns = [
          'agent.name',
          ...ecsColumnsWithData.sort(),
          ...osqueryColumns,
        ]
          .filter((col) => allColumnIds.includes(col))
          .slice(0, 10);

        setVisibleColumns((current) =>
          !isEqual(current, defaultVisibleColumns) ? defaultVisibleColumns : current
        );
      }
    } else {
      setColumns((currentColumns) =>
        !isEqual(map('id', currentColumns), allColumnIds) ? newColumns : currentColumns
      );
      setVisibleColumns(allColumnIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    queryHistoryRework,
    allResultsData?.columns.length,
    ecsMappingColumns,
    getHeaderDisplay,
    allResultsData?.columns,
    hasUserSetColumns,
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

  // --- Unified DataTable: handlers ---
  const handleSort = useCallback((newSort: string[][]) => {
    setSortingColumns(
      newSort.map(([id, direction]) => ({
        id,
        direction: direction as 'asc' | 'desc',
      }))
    );
    // Reset to first page when sort changes (server-side sorting)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleSetColumns = useCallback((newColumns: string[], _hideTimeColumn: boolean) => {
    setHasUserSetColumns(true);
    setVisibleColumns(newColumns);
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

  // Server-side pagination: compute total pages and handle page navigation
  const totalResults = allResultsData?.total ?? 0;
  const totalPages = Math.ceil(totalResults / pagination.pageSize);

  const handleServerPageChange = useCallback(
    (pageIndex: number) => {
      if ((pageIndex + 1) * pagination.pageSize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
        showPaginationLimitToast();

        return;
      }

      setPagination((prev) => ({ ...prev, pageIndex }));
    },
    [pagination.pageSize, showPaginationLimitToast]
  );

  const handleServerPageSizeChange = useCallback((pageSize: number) => {
    setPagination({ pageIndex: 0, pageSize });
  }, []);

  const SearchBar = unifiedSearch.ui.SearchBar;
  const indexPatterns = useMemo(() => (dataView ? [dataView] : []), [dataView]);

  // Collect all dot-notation field paths present in the result _source documents.
  // This captures ECS fields (e.g. process.name, host.ip) that are stored in
  // _source but may not appear in the ES `fields` response.
  const sourceFieldNames = useMemo(() => {
    const names = new Set<string>();
    const edges = allResultsData?.edges ?? [];
    if (!edges.length) return names;

    // Flatten nested _source objects into dot-notation paths
    const collectPaths = (obj: unknown, prefix = '') => {
      if (!obj || typeof obj !== 'object') return;
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          collectPaths(value, path);
        } else {
          names.add(path);
        }
      }
    };

    // Sample first few edges to discover fields (no need to scan all)
    for (const edge of edges.slice(0, 5)) {
      if (edge._source) {
        collectPaths(edge._source);
      }
    }

    return names;
  }, [allResultsData?.edges]);

  // Create a filtered data view for the SearchBar that only shows fields from
  // the current result set (not all ECS fields from the index mapping).
  const searchBarIndexPatterns = useMemo(() => {
    if (!dataView || !allResultsData?.columns?.length) return indexPatterns;

    // Collect all field names that are relevant to the current results
    const resultFieldNames = new Set<string>();

    // Add agent.name (always shown)
    resultFieldNames.add('agent.name');
    resultFieldNames.add('agent.id');

    // Add ECS mapping columns (these need to appear in suggestions even before typing)
    for (const col of ecsMappingColumns) {
      resultFieldNames.add(col);
    }

    // Add all columns from ES `fields` response (osquery.*, action_id, etc.)
    for (const col of allResultsData.columns) {
      resultFieldNames.add(col);
      if (col.startsWith('osquery.') && !col.endsWith('.number')) {
        resultFieldNames.add(`${col}.number`);
      }
    }

    // Add all fields discovered from _source (ECS fields like process.name, host.ip)
    for (const name of sourceFieldNames) {
      resultFieldNames.add(name);
    }

    // Filter the data view fields to only include result-relevant fields
    const filteredFields = dataView.fields.filter(
      (field) => resultFieldNames.has(field.name) || field.name === '@timestamp'
    );

    // If filtering didn't reduce the field list, just use the original
    if (filteredFields.length >= dataView.fields.length) return indexPatterns;

    // Create a lightweight wrapper that the SearchBar can use for suggestions
    const filteredDataView = {
      ...dataView,
      fields: filteredFields,
      getFieldByName: (name: string) => filteredFields.find((f) => f.name === name),
    };

    return [filteredDataView] as typeof indexPatterns;
  }, [dataView, allResultsData?.columns, ecsMappingColumns, sourceFieldNames, indexPatterns]);

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
          chrome={chrome}
        />
      );
    },
    [dataView, handleCloseFlyout, toasts, chrome]
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

        <div css={resultsTableContainerCss}>
          {/* Unified Search Bar with KQL autocomplete and filter pills */}
          <div css={searchBarWrapperCss}>
            <SearchBar
              appName="osquery"
              indexPatterns={searchBarIndexPatterns}
              query={query}
              filters={filters}
              filtersForSuggestions={filtersForSuggestions}
              onQuerySubmit={handleQuerySubmit}
              onFiltersUpdated={handleFiltersUpdated}
              showDatePicker={false}
              showQueryInput
              showFilterBar
              showQueryMenu={false}
              displayStyle="withBorders"
              placeholder={i18n.translate('xpack.osquery.resultsTable.searchPlaceholder', {
                defaultMessage: 'Search results (KQL)',
              })}
              dataTestSubj="osqueryResultsSearchBar"
            />
          </div>

          {!allResultsData?.edges.length ? (
            <EuiPanel hasShadow={false} data-test-subj="osqueryResultsPanel">
              <EuiCallOut
                announceOnMount
                title={generateEmptyDataMessage(data?.aggregations.totalResponded ?? 0)}
              />
            </EuiPanel>
          ) : (
            <>
              <div css={unifiedTableWrapperCss}>
                <CellActionsProvider
                  getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}
                >
                  <UnifiedDataTable
                    ariaLabelledBy="osquery-results"
                    data-test-subj="osqueryResultsTable"
                    dataView={dataView}
                    columns={visibleColumns}
                    rows={rows}
                    loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
                    expandedDoc={expandedDoc}
                    setExpandedDoc={setExpandedDoc}
                    renderDocumentView={renderDocumentView}
                    trailingControlColumns={trailingColumns}
                    externalCustomRenderers={externalCustomRenderers}
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
                    isPaginationEnabled={false}
                    rowHeightState={rowHeight}
                    onUpdateRowHeight={handleUpdateRowHeight}
                    dataGridDensityState={density}
                    onUpdateDataGridDensity={handleUpdateDensity}
                    sampleSizeState={allResultsData?.total ?? 0}
                    totalHits={allResultsData?.total}
                    services={unifiedDataTableServices}
                    consumer="osquery"
                    enableComparisonMode
                    controlColumnIds={CONTROL_COLUMN_IDS}
                    onFilter={handleFilter}
                    gridStyleOverride={gridStyleOverride}
                  />
                </CellActionsProvider>
              </div>

              {/* Server-side pagination controls */}
              <EuiTablePagination
                pageCount={totalPages}
                activePage={pagination.pageIndex}
                onChangePage={handleServerPageChange}
                itemsPerPage={pagination.pageSize}
                onChangeItemsPerPage={handleServerPageSizeChange}
                itemsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                showPerPageOptions
              />
            </>
          )}
        </div>
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
