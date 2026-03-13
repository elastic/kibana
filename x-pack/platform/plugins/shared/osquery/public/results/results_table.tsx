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
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UnifiedDataTable, DataLoadingState, DataGridDensity } from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { DataTableRecord } from '@kbn/discover-utils';
import { AddToTimelineButton } from '../timelines/add_to_timeline_button';
import type { AddToTimelineHandler } from '../types';
import { useAllResults } from './use_all_results';
import type { ResultEdges } from '../../common/search_strategy';
import { Direction } from '../../common/search_strategy';
import { useKibana } from '../common/lib/kibana';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../common/constants';
import { useActionResults } from '../action_results/use_action_results';
import { generateEmptyDataMessage, PAGINATION_LIMIT_TITLE } from './translations';
import { ViewResultsInDiscoverAction } from '../discover/view_results_in_discover';
import { ViewResultsInLensAction } from '../lens/view_results_in_lens';
import { ViewResultsActionButtonType } from '../live_queries/form/pack_queries_status_table';
import { PLUGIN_NAME as OSQUERY_PLUGIN_NAME } from '../../common';
import { AddToCaseWrapper } from '../cases/add_to_cases';
import { useIsExperimentalFeatureEnabled } from '../common/experimental_features_context';
import { transformEdgesToRecords } from './transform_results';
import { getOsqueryCellRenderers } from './cell_renderers';
import { OsqueryResultsFlyout } from './results_flyout';
import { useOsqueryDataView } from './use_osquery_data_view';
import { useResultsFiltering } from './use_results_filtering';

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

const legacyResultsTableContainerCss = {
  width: '100%',
  maxWidth: '1200px',
};

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
  scheduleId?: string;
  executionCount?: number;
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
  scheduleId,
  executionCount,
}) => {
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
    scheduleId,
    executionCount,
  });
  const expired = useMemo(() => (!endDate ? false : new Date(endDate) < new Date()), [endDate]);
  const {
    application: { getUrlForApp },
    appName,
    notifications: { toasts },
    i18n: i18nStart,
    theme,
  } = useKibana().services;
  const getFleetAppUrl = useCallback(
    (agentId: any) =>
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
    (pageSize: any) => {
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

  const { data: allResultsData, isLoading } = useAllResults({
    actionId,
    liveQueryActionId,
    startDate,
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    isLive,
    sort: sortingColumns.map((sortedColumn) => ({
      field: sortedColumn.id,
      direction: sortedColumn.direction as Direction,
    })),
    scheduleId,
    executionCount,
  });

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const columnVisibility = useMemo(
    () => ({ visibleColumns, setVisibleColumns }),
    [visibleColumns, setVisibleColumns]
  );

  const ecsMappingColumns = useMemo(() => keys(ecsMapping || {}), [ecsMapping]);

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

    setColumns((currentColumns) =>
      !isEqual(map('id', currentColumns), map('id', newColumns)) ? newColumns : currentColumns
    );
    setVisibleColumns(map('id', newColumns));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allResultsData?.columns.length, ecsMappingColumns, getHeaderDisplay]);

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
            scheduleId={scheduleId}
            executionCount={executionCount}
          />
          <ViewResultsInLensAction
            actionId={actionId}
            buttonType={ViewResultsActionButtonType.button}
            endDate={endDate}
            startDate={startDate}
            scheduleId={scheduleId}
            executionCount={executionCount}
          />
          <AddToTimelineButton field="action_id" value={actionId} addToTimeline={addToTimeline} />
          {(liveQueryActionId || scheduleId) && (
            <AddToCaseWrapper
              actionId={liveQueryActionId || scheduleId || ''}
              queryId={actionId}
              agentIds={agentIds}
              scheduleId={scheduleId}
              executionCount={executionCount}
            />
          )}
        </>
      ),
    }),
    [
      actionId,
      addToTimeline,
      agentIds,
      appName,
      endDate,
      executionCount,
      liveQueryActionId,
      scheduleId,
      startDate,
    ]
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
          <div css={legacyResultsTableContainerCss}>
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

const LegacyResultsTable = React.memo(ResultsTableComponent);

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500];
const CONTROL_COLUMN_IDS = ['openDetails', 'select'];
const storageInstance = new Storage(localStorage);

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
  minHeight: 200,
};

const gridStyleOverride = {
  border: 'all' as const,
  header: 'shade' as const,
  stripes: false,
};

interface UnifiedDataTableSettings {
  columns?: Record<string, { width?: number }>;
}

const UnifiedResultsTableComponent: React.FC<ResultsTableComponentProps> = ({
  actionId,
  agentIds,
  ecsMapping,
  startDate,
  endDate,
  liveQueryActionId,
  error,
  addToTimeline,
  scheduleId,
  executionCount,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isLive, setIsLive] = useState(true);

  const searchBarWrapperCss = useMemo(
    () => ({
      padding: `${euiTheme.size.m}`,
      backgroundColor: euiTheme.colors.body,
    }),
    [euiTheme.size.m, euiTheme.colors.body]
  );

  const { data: actionResultsData } = useActionResults({
    actionId,
    startDate,
    activePage: 0,
    agentIds,
    limit: 0,
    direction: Direction.asc,
    sortField: '@timestamp',
    isLive,
    scheduleId,
    executionCount,
  });

  const expired = useMemo(() => (!endDate ? false : new Date(endDate) < new Date()), [endDate]);

  const {
    application: { getUrlForApp },
    appName,
    theme,
    uiSettings,
    notifications: { toasts },
    data: dataService,
    analytics,
    i18n: i18nStart,
    uiActions,
    unifiedSearch,
    chrome,
  } = useKibana().services;

  const startServices = useMemo(
    () => ({ analytics, i18n: i18nStart, theme }),
    [analytics, i18nStart, theme]
  );

  const unifiedDataTableServices = useMemo(
    () => ({
      theme,
      fieldFormats: dataService.fieldFormats,
      uiSettings,
      toastNotifications: toasts,
      storage: storageInstance,
      data: dataService,
    }),
    [dataService, theme, toasts, uiSettings]
  );

  const getFleetAppUrl = useCallback(
    (agentId: string) =>
      getUrlForApp('fleet', {
        path: pagePathGetters.agent_details({ agentId })[1],
      }),
    [getUrlForApp]
  );

  const showPaginationLimitToast = useCallback(() => {
    toasts.addDanger({
      title: PAGINATION_LIMIT_TITLE,
      text: toMountPoint(<PaginationLimitToastContent />, startServices),
    });
  }, [toasts, startServices]);

  const { dataView, isLoading: isDataViewLoading } = useOsqueryDataView();

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  const [sortingColumns, setSortingColumns] = useState<
    Array<{ id: string; direction: 'asc' | 'desc' }>
  >([{ id: 'agent.name', direction: Direction.asc }]);

  const ecsMappingColumns = useMemo(() => keys(ecsMapping || {}), [ecsMapping]);

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
      enabled: true,
      dataView,
      actionId,
      scheduleId,
      executionCount,
    },
    resetFilterPagination
  );

  const handleFilterForGrid = useCallback(
    (mapping: unknown, value: unknown, mode: '+' | '-') => {
      if (mapping && typeof mapping === 'object' && 'name' in mapping) {
        handleFilter(mapping as any, value, mode);
      } else if (typeof mapping === 'string') {
        handleFilter({ name: mapping } as any, value, mode);
      }
    },
    [handleFilter]
  );

  const { data: allResultsData, isLoading } = useAllResults({
    actionId,
    liveQueryActionId,
    startDate,
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    kuery,
    isLive,
    sort: sortingColumns.map((col) => ({
      field: col.id,
      direction: col.direction as Direction,
    })),
    scheduleId,
    executionCount,
  });

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [hasUserSetColumns, setHasUserSetColumns] = useState(false);
  const [rowHeight, setRowHeight] = useState<number>(0);
  const [density, setDensity] = useState<DataGridDensity>(DataGridDensity.EXPANDED);
  const [gridSettings, setGridSettings] = useState<UnifiedDataTableSettings>({});

  const rows = useMemo(
    () =>
      transformEdgesToRecords({
        edges: allResultsData?.edges ?? [],
        ecsMapping,
      }),
    [allResultsData?.edges, ecsMapping]
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

  // --- Unified DataTable: handlers ---
  // EuiDataGrid appends new sort columns to the end of the list, but the
  // server API only uses the first sort field. Move newly added columns to
  // the front so the most recently selected column becomes the primary sort.
  const handleSort = useCallback((newSort: string[][]) => {
    setSortingColumns((prevCols) => {
      const prevIds = new Set(prevCols.map((col) => col.id));
      const added = newSort.filter(([id]) => !prevIds.has(id));
      const existing = newSort.filter(([id]) => prevIds.has(id));
      const reordered = [...added, ...existing];

      return reordered.map(([id, direction]) => ({
        id,
        direction: direction as 'asc' | 'desc',
      }));
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleSetColumns = useCallback((_newColumns: string[], _hideTimeColumn: boolean) => {
    setHasUserSetColumns(true);
    setVisibleColumns(_newColumns);
  }, []);

  const handleUpdateRowHeight = useCallback((newRowHeight: number) => {
    setRowHeight(newRowHeight);
  }, []);

  const handleUpdateDensity = useCallback((newDensity: DataGridDensity) => {
    setDensity(newDensity);
  }, []);

  const handleResize = useCallback(
    (colSettings: { columnId: string; width: number | undefined }) => {
      setGridSettings((prev: UnifiedDataTableSettings) => ({
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

  // Auto-compute visible columns from result data when user hasn't set them manually.
  // Deduplicates osquery.* fields by their short name (second segment) — e.g.
  // osquery.description and osquery.description.text both map to "description",
  // so only one column is shown (preferring .number variant when available).
  useEffect(() => {
    if (hasUserSetColumns || !allResultsData?.columns?.length) return;

    const seenShortNames = new Set<string>();
    const cols: string[] = [];

    const addCol = (col: string, dedupeKey?: string) => {
      const key = dedupeKey ?? col;
      if (!seenShortNames.has(key)) {
        seenShortNames.add(key);
        cols.push(col);
      }
    };

    addCol('agent.name');
    ecsMappingColumns.sort().forEach((col) => addCol(col));

    for (const fieldName of allResultsData.columns) {
      if (fieldName.startsWith('osquery.')) {
        const shortName = fieldName.split('.')[1];
        const hasNumber = allResultsData.columns.includes(`${fieldName}.number`);
        const id = hasNumber ? `${fieldName}.number` : fieldName;
        addCol(id, shortName);
      }
    }

    const capped = cols.slice(0, 10);
    setVisibleColumns((prev) => (isEqual(prev, capped) ? prev : capped));
  }, [allResultsData?.columns, ecsMappingColumns, hasUserSetColumns]);

  // Strip "osquery." prefix from column headers via settings.columns[col].display.
  // UDT reads this before building the header element, so the field-type token is
  // still derived from the actual column name while the short name is displayed.
  const osqueryColumnDisplaySettings = useMemo(() => {
    const columns: Record<string, { display: string }> = {};
    for (const col of visibleColumns) {
      if (col.startsWith('osquery.')) {
        columns[col] = { display: col.split('.')[1] };
      }
    }

    return columns;
  }, [visibleColumns]);

  const mergedGridSettings = useMemo(
    () => ({
      ...gridSettings,
      columns: { ...osqueryColumnDisplaySettings, ...gridSettings.columns },
    }),
    [gridSettings, osqueryColumnDisplaySettings]
  );

  // Server-side pagination
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

  // Collect all dot-notation field paths present in the result _source documents
  const sourceFieldNames = useMemo(() => {
    const names = new Set<string>();
    const edges = allResultsData?.edges ?? [];
    if (!edges.length) return names;

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

    for (const edge of edges.slice(0, 5)) {
      if (edge._source) {
        collectPaths(edge._source);
      }
    }

    return names;
  }, [allResultsData?.edges]);

  // Filtered data view for SearchBar field suggestions scoped to result columns
  const searchBarIndexPatterns = useMemo(() => {
    if (!dataView || !allResultsData?.columns?.length) return indexPatterns;

    const resultFieldNames = new Set<string>();

    resultFieldNames.add('agent.name');
    resultFieldNames.add('agent.id');

    for (const col of ecsMappingColumns) {
      resultFieldNames.add(col);
    }

    for (const col of allResultsData.columns) {
      resultFieldNames.add(col);
      if (col.startsWith('osquery.') && !col.endsWith('.number')) {
        resultFieldNames.add(`${col}.number`);
      }
    }

    for (const name of sourceFieldNames) {
      resultFieldNames.add(name);
    }

    const filteredFields = dataView.fields.filter(
      (field) => resultFieldNames.has(field.name) || field.name === '@timestamp'
    );

    if (filteredFields.length >= dataView.fields.length) return indexPatterns;

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
    (hit: DataTableRecord, displayedRows: DataTableRecord[], displayedColumns: string[]) => {
      if (!dataView) return undefined;

      return (
        <OsqueryResultsFlyout
          hit={hit}
          hits={displayedRows}
          dataView={dataView}
          columns={displayedColumns}
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
          actionResultsData.aggregations.totalResponded !== agentIds?.length ||
          allResultsData?.total !== actionResultsData.aggregations?.totalRowCount ||
          (allResultsData?.total && !allResultsData?.edges.length)
        );
      }),
    [
      agentIds?.length,
      actionResultsData.aggregations,
      allResultsData?.edges.length,
      allResultsData?.total,
      error,
      expired,
    ]
  );

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
        {/* Search bar with KQL autocomplete and filter pills */}
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
            displayStyle="inPage"
            placeholder={i18n.translate('xpack.osquery.resultsTable.searchPlaceholder', {
              defaultMessage: 'Search results (KQL)',
            })}
            dataTestSubj="osqueryResultsSearchBar"
          />
        </div>

        {rows.length > 0 ? (
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
                  externalCustomRenderers={externalCustomRenderers}
                  sort={sortingColumns.map((col) => [col.id, col.direction])}
                  onSort={handleSort}
                  onSetColumns={handleSetColumns}
                  onResize={handleResize}
                  settings={mergedGridSettings}
                  showTimeCol={false}
                  showFullScreenButton={appName === OSQUERY_PLUGIN_NAME}
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
                  showColumnTokens
                  controlColumnIds={CONTROL_COLUMN_IDS}
                  onFilter={handleFilterForGrid}
                  gridStyleOverride={gridStyleOverride}
                />
              </CellActionsProvider>
            </div>

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
        ) : (
          <EuiPanel hasShadow={false} data-test-subj="osqueryResultsPanel">
            <EuiCallOut
              announceOnMount
              title={
                kuery
                  ? i18n.translate('xpack.osquery.resultsTable.noFilterResults', {
                      defaultMessage: 'No results match your search criteria',
                    })
                  : generateEmptyDataMessage(actionResultsData?.aggregations.totalResponded ?? 0)
              }
            />
          </EuiPanel>
        )}
      </div>
    </>
  );
};

const UnifiedResultsTable = React.memo(UnifiedResultsTableComponent);

const ResultsTableSwitch: React.FC<ResultsTableComponentProps> = (props) => {
  const isUnifiedEnabled = useIsExperimentalFeatureEnabled('osqueryUnifiedDataTable');

  if (isUnifiedEnabled) {
    return <UnifiedResultsTable {...props} />;
  }

  return <LegacyResultsTable {...props} />;
};

export const ResultsTable = React.memo(ResultsTableSwitch);
