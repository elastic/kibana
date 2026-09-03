/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridOnColumnResizeHandler,
  EuiDataGridSorting,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
  EuiThemeModifications,
} from '@elastic/eui';
import {
  EuiButton,
  EuiDataGrid,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiText,
  EuiThemeProvider,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useDebounceFn } from '@kbn/react-hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { EntityTablePageSize } from '../../../../common/url_schema';
import { ENTITY_TABLE_PAGE_SIZES } from '../../../../common/url_schema';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { getFormattedError } from '../../../util/errors';
import { useKbnUrlStateStorageFromRouterContext } from '../../../util/kbn_url_state_context';
import { FilterGroup } from '../../stream_list_view/filter_group';
import { getDestinationNodeId } from '../../stream_management/data_management/stream_detail_canvas/build_destination';
import { getCanvasDestinationNames } from '../../stream_management/data_management/stream_detail_canvas/build_graph';
import { navigateToCanvasFocus } from '../../stream_management/data_management/stream_detail_canvas/canvas_focus';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import type { EntityTableSortDirection } from '../entity_table';
import { buildDestinationRows, getEffectiveSortField } from './build_destination_rows';
import {
  createDestinationActionsColumn,
  createDestinationCellRenderer,
  createDestinationColumns,
  DEFAULT_VISIBLE_COLUMNS,
} from './destination_columns';
import {
  useDestinationsTableEvents,
  useDestinationsTableSelector,
} from './state_management/use_destinations_table';
import {
  DATA_QUALITY_DEGRADED_LABEL,
  DATA_QUALITY_FILTER_LABEL,
  DATA_QUALITY_GOOD_LABEL,
  DATA_QUALITY_POOR_LABEL,
  ERROR_PROMPT_TITLE,
  LOADING_PROMPT_TITLE,
  NO_DESTINATIONS_MESSAGE,
  RETRY_BUTTON_LABEL,
  SEARCH_ARIA_LABEL,
  SEARCH_PLACEHOLDER,
  TABLE_CAPTION,
} from './translations';
import { useDestinationMetrics } from './use_destination_metrics';

const SEARCH_DEBOUNCE_OPTIONS = { wait: 300 };

const GRID_STYLE: EuiDataGridStyle = {
  border: 'all',
  header: 'shade',
  stripes: false,
  rowHover: 'highlight',
};

const TRANSPARENT_COLUMN_SEPARATORS: EuiThemeModifications = {
  components: {
    LIGHT: { dataGridVerticalLineBorderColor: 'transparent' },
    DARK: { dataGridVerticalLineBorderColor: 'transparent' },
  },
};

const GRID_WRAPPER_PROPS = { cloneElement: true } as const;

const ROW_HEIGHTS_OPTIONS = { defaultHeight: 'auto' } as const;

const TOOLBAR_VISIBILITY: EuiDataGridToolBarVisibilityOptions = {
  showSortSelector: false,
  showFullScreenSelector: false,
};

export function DestinationsTable() {
  const { timeState$ } = useTimefilter();

  const error = useDestinationsTableSelector((state) => state.context.error);
  const hasFailed = useDestinationsTableSelector((state) => state.matches('failure'));
  // Wait for the first row load before mounting the table body: the metric
  // fetches are batched and cached on first call, so they must not start
  // before the rows (and their failure-store privileges) are known.
  const isInitializing = useDestinationsTableSelector(
    (state) =>
      state.matches('initializingFromUrl') ||
      (state.matches('loading') && state.context.items.length === 0)
  );
  const { refresh } = useDestinationsTableEvents();

  // The metrics are range-scoped, so refetch the rows whenever the time range
  // moves to avoid mixing fresh metrics with a stale destination list.
  useEffect(() => {
    const subscription = timeState$.subscribe({
      next: ({ kind }) => {
        if (kind !== 'initial') {
          refresh();
        }
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [timeState$, refresh]);

  if (hasFailed) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        data-test-subj="streamsDestinationsError"
        title={<h2>{ERROR_PROMPT_TITLE}</h2>}
        body={error ? <p>{getFormattedError(error).message}</p> : undefined}
        actions={
          <EuiButton
            color="danger"
            onClick={refresh}
            data-test-subj="streamsDestinationsRetryButton"
          >
            {RETRY_BUTTON_LABEL}
          </EuiButton>
        }
      />
    );
  }

  if (isInitializing) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingElastic size="xl" />}
        data-test-subj="streamsDestinationsLoading"
        title={<h2>{LOADING_PROMPT_TITLE}</h2>}
      />
    );
  }

  return <DestinationsTableContent />;
}

function DestinationsTableContent() {
  const router = useStreamsAppRouter();
  const history = useHistory();
  const { rangeFrom, rangeTo } = useTimeRange();
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();

  const destinations = useDestinationsTableSelector((state) => state.context.items);
  const urlState = useDestinationsTableSelector((state) => state.context.urlState);
  const { changeSearch, changeSort, changePage } = useDestinationsTableEvents();
  const [searchText, setSearchText] = useState(urlState.query);
  const [selectedQualities, setSelectedQualities] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const { run: debouncedChangeSearch } = useDebounceFn(changeSearch, SEARCH_DEBOUNCE_OPTIONS);

  const {
    hasFailureStoreAccess,
    getStreamHistogram,
    timeState,
    docsByStream,
    qualityByStream,
    docCountsLoaded,
    qualityLoading,
    qualityLoaded,
    ingestionByStream,
    ingestionLoaded,
    ingestionError,
    storageByStream,
    storageLoaded,
  } = useDestinationMetrics(destinations);

  const sortField = getEffectiveSortField(urlState.sortField, {
    documentsCount: docCountsLoaded,
    ingestionRate: ingestionLoaded && !ingestionError,
    storageBytes: storageLoaded,
    dataQuality: qualityLoaded,
  });

  const rows = useMemo(
    () =>
      buildDestinationRows({
        destinations,
        searchText,
        selectedQualities,
        docsByStream,
        ingestionByStream,
        storageByStream,
        qualityByStream,
        sortField,
        sortDirection: urlState.sortDirection,
      }),
    [
      destinations,
      searchText,
      selectedQualities,
      docsByStream,
      ingestionByStream,
      storageByStream,
      qualityByStream,
      sortField,
      urlState.sortDirection,
    ]
  );

  const handleSort = useCallback<EuiDataGridSorting['onSort']>(
    (sortingColumns) => {
      // The grid sorts on a single column, so the newest entry wins.
      const nextSort = sortingColumns[sortingColumns.length - 1];
      changeSort(
        nextSort?.id ?? 'name',
        (nextSort?.direction ?? 'asc') as EntityTableSortDirection
      );
    },
    [changeSort]
  );

  const getDestinationHref = useCallback(
    (destinationName: string) =>
      router.link('/{key}', {
        path: { key: destinationName },
        query: { rangeFrom, rangeTo },
      }),
    [router, rangeFrom, rangeTo]
  );

  const canvasDestinationNames = useMemo(
    () =>
      getCanvasDestinationNames(destinations.map((destination) => destination.streamDefinition)),
    [destinations]
  );

  const handleShowOnCanvas = useCallback(
    (destinationName: string) => {
      navigateToCanvasFocus(
        urlStateStorageContainer,
        history,
        getDestinationNodeId(destinationName)
      );
    },
    [urlStateStorageContainer, history]
  );

  const handleColumnResize = useCallback<EuiDataGridOnColumnResizeHandler>(
    ({ columnId, width }) => {
      setColumnWidths((previous) => ({ ...previous, [columnId]: width }));
    },
    []
  );

  const handleResetColumnWidth = useCallback((columnId: string) => {
    setColumnWidths(({ [columnId]: _removed, ...remaining }) => remaining);
  }, []);

  const columns = useMemo(
    () =>
      createDestinationColumns({
        hasFailureStoreAccess,
        docCountsLoaded,
        ingestionLoaded,
        ingestionError,
        storageLoaded,
        qualityLoaded,
        visibleColumns,
        columnWidths,
        onResetColumnWidth: handleResetColumnWidth,
      }),
    [
      hasFailureStoreAccess,
      docCountsLoaded,
      ingestionLoaded,
      ingestionError,
      storageLoaded,
      qualityLoaded,
      visibleColumns,
      columnWidths,
      handleResetColumnWidth,
    ]
  );

  const renderCellValue = useMemo(
    () =>
      createDestinationCellRenderer({
        rows,
        searchText,
        getDestinationHref,
        getStreamHistogram,
        timeState,
        ingestionLoaded,
        ingestionError,
        storageLoaded,
        qualityLoading,
      }),
    [
      rows,
      searchText,
      getDestinationHref,
      getStreamHistogram,
      timeState,
      ingestionLoaded,
      ingestionError,
      storageLoaded,
      qualityLoading,
    ]
  );

  const trailingControlColumns = useMemo(
    () => [
      createDestinationActionsColumn({
        rows,
        canvasDestinationNames,
        onShowOnCanvas: handleShowOnCanvas,
      }),
    ],
    [rows, canvasDestinationNames, handleShowOnCanvas]
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      className={css`
        flex: 1;
        min-height: 0;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              compressed
              incremental
              placeholder={SEARCH_PLACEHOLDER}
              aria-label={SEARCH_ARIA_LABEL}
              value={searchText}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setSearchText(nextQuery);
                debouncedChangeSearch(nextQuery);
              }}
              data-test-subj="streamsDestinationsSearch"
            />
          </EuiFlexItem>
          {qualityLoaded && hasFailureStoreAccess && (
            <EuiFlexItem grow={false}>
              <EuiFilterGroup compressed>
                <FilterGroup
                  label={DATA_QUALITY_FILTER_LABEL}
                  options={[
                    { key: 'good', label: DATA_QUALITY_GOOD_LABEL },
                    { key: 'degraded', label: DATA_QUALITY_DEGRADED_LABEL },
                    { key: 'poor', label: DATA_QUALITY_POOR_LABEL },
                  ]}
                  onChange={setSelectedQualities}
                />
              </EuiFilterGroup>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <StreamsAppSearchBar showDatePicker />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem
        grow
        className={css`
          min-height: 0;
        `}
      >
        <EuiThemeProvider modify={TRANSPARENT_COLUMN_SEPARATORS} wrapperProps={GRID_WRAPPER_PROPS}>
          <EuiDataGrid
            data-test-subj="streamsDestinationsTable"
            aria-label={TABLE_CAPTION}
            columns={columns}
            columnVisibility={{
              visibleColumns,
              setVisibleColumns,
              canDragAndDropColumns: false,
            }}
            trailingControlColumns={trailingControlColumns}
            onColumnResize={handleColumnResize}
            rowCount={rows.length}
            renderCellValue={renderCellValue}
            renderCustomGridBody={rows.length === 0 ? EmptyGridBody : undefined}
            gridStyle={GRID_STYLE}
            rowHeightsOptions={ROW_HEIGHTS_OPTIONS}
            toolbarVisibility={TOOLBAR_VISIBILITY}
            sorting={{
              columns: [{ id: sortField, direction: urlState.sortDirection }],
              onSort: handleSort,
            }}
            pagination={{
              pageIndex: urlState.pageIndex,
              pageSize: urlState.pageSize,
              pageSizeOptions: [...ENTITY_TABLE_PAGE_SIZES],
              onChangePage: (pageIndex) => changePage(pageIndex, urlState.pageSize),
              onChangeItemsPerPage: (pageSize) => changePage(0, pageSize as EntityTablePageSize),
            }}
          />
        </EuiThemeProvider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function EmptyGridBody() {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiText
      size="s"
      color="subdued"
      textAlign="center"
      data-test-subj="streamsDestinationsEmpty"
      className={css`
        padding: ${euiTheme.size.l};
      `}
    >
      {NO_DESTINATIONS_MESSAGE}
    </EuiText>
  );
}
