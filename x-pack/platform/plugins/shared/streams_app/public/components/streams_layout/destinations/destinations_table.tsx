/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLoadingElastic,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useDebounceFn } from '@kbn/react-hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ENTITY_TABLE_PAGE_SIZES } from '../../../../common/url_schema';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { getFormattedError } from '../../../util/errors';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { FilterGroup } from '../../stream_list_view/filter_group';
import type { EntityTableSortDirection } from '../entity_table';
import { buildDestinationRows } from './build_destination_rows';
import { createDestinationColumns, getEffectiveSortField } from './destination_columns';
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
import type { DestinationRow } from './types';
import { useDestinationMetrics } from './use_destination_metrics';

const SEARCH_DEBOUNCE_OPTIONS = { wait: 300 };

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
  const { rangeFrom, rangeTo } = useTimeRange();

  const destinations = useDestinationsTableSelector((state) => state.context.items);
  const urlState = useDestinationsTableSelector((state) => state.context.urlState);
  const isLoading = useDestinationsTableSelector((state) => state.matches('loading'));
  const { changeSearch, changeSort, changePage } = useDestinationsTableEvents();
  const [searchText, setSearchText] = useState(urlState.query);
  const [selectedQualities, setSelectedQualities] = useState<string[]>([]);
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
      }),
    [
      destinations,
      searchText,
      selectedQualities,
      docsByStream,
      ingestionByStream,
      storageByStream,
      qualityByStream,
    ]
  );

  const sortField = getEffectiveSortField(urlState.sortField, {
    documentsCount: docCountsLoaded,
    ingestionRate: ingestionLoaded && !ingestionError,
    storageBytes: storageLoaded,
    dataQuality: qualityLoaded,
  });

  const handleTableChange = ({ sort, page }: CriteriaWithPagination<DestinationRow>) => {
    if (sort) {
      changeSort(String(sort.field), sort.direction as EntityTableSortDirection);
    }
    if (page) {
      changePage(page.index, page.size);
    }
  };

  const getDestinationHref = useCallback(
    (destinationName: string) =>
      router.link('/{key}', {
        path: { key: destinationName },
        query: { rangeFrom, rangeTo },
      }),
    [router, rangeFrom, rangeTo]
  );

  const columns = createDestinationColumns({
    searchText,
    getDestinationHref,
    hasFailureStoreAccess,
    getStreamHistogram,
    timeState,
    docCountsLoaded,
    ingestionLoaded,
    ingestionError,
    storageLoaded,
    qualityLoaded,
    qualityLoading,
  });

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
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
          overflow-y: auto;
        `}
      >
        <EuiInMemoryTable<DestinationRow>
          loading={isLoading}
          data-test-subj="streamsDestinationsTable"
          itemId="name"
          items={rows}
          noItemsMessage={NO_DESTINATIONS_MESSAGE}
          tableCaption={TABLE_CAPTION}
          onTableChange={handleTableChange}
          sorting={{
            sort: {
              field: sortField,
              direction: urlState.sortDirection,
            },
          }}
          pagination={{
            initialPageSize: ENTITY_TABLE_PAGE_SIZES[0],
            pageSizeOptions: [...ENTITY_TABLE_PAGE_SIZES],
            pageIndex: urlState.pageIndex,
            pageSize: urlState.pageSize,
          }}
          columns={columns}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
