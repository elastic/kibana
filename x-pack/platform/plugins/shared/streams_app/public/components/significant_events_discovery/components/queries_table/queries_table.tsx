/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useMutation, useQueryClient } from '@kbn/react-query';
import React, { useState, useCallback, useMemo } from 'react';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  DISCOVERY_QUERIES_QUERY_KEY,
  useFetchDiscoveryQueries,
  type SignificantEventQueryRow,
} from '../../../../hooks/use_fetch_discovery_queries';
import {
  DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY,
  useFetchDiscoveryQueriesOccurrences,
} from '../../../../hooks/use_fetch_discovery_queries_occurrences';
import { useKibana } from '../../../../hooks/use_kibana';
import { useQueriesApi } from '../../../../hooks/use_queries_api';
import {
  UNBACKED_QUERIES_COUNT_QUERY_KEY,
  useUnbackedQueriesCount,
} from '../../../../hooks/use_unbacked_queries_count';
import { getFormattedError } from '../../../../util/errors';
import { LoadingPanel } from '../../../loading_panel';
import { SparkPlot } from '../../../spark_plot';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';
import { SeverityBadge } from '../severity_badge/severity_badge';
import { useFetchStreams } from '../../hooks/use_fetch_streams';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { buildDiscoverParams } from '../../utils/discover_helpers';
import {
  ACTIONS_COLUMN_TITLE,
  BACKED_STATUS_COLUMN,
  CHART_SERIES_NAME,
  CHART_TITLE,
  DELETE_QUERY_ERROR_TOAST_TITLE,
  DETAILS_BUTTON_ARIA_LABEL,
  IMPACT_COLUMN,
  LAST_OCCURRED_COLUMN,
  NO_ITEMS_MESSAGE,
  NOT_PROMOTED_BADGE_LABEL,
  NOT_PROMOTED_TOOLTIP_CONTENT,
  OCCURRENCES_COLUMN,
  OCCURRENCES_TOOLTIP_NAME,
  OPEN_IN_DISCOVER_ACTION_DESCRIPTION,
  OPEN_IN_DISCOVER_ACTION_TITLE,
  PROMOTED_BADGE_LABEL,
  PROMOTED_TOOLTIP_CONTENT,
  PROMOTE_ALL_BUTTON,
  PROMOTE_ALL_CALLOUT_DESCRIPTION,
  PROMOTE_ALL_ERROR_TOAST_TITLE,
  PROMOTE_QUERY_ACTION_DESCRIPTION,
  PROMOTE_QUERY_ACTION_TITLE,
  SAVE_QUERY_ERROR_TOAST_TITLE,
  SEARCH_PLACEHOLDER,
  STREAM_COLUMN,
  TABLE_CAPTION,
  TITLE_COLUMN,
  UNABLE_TO_LOAD_QUERIES_BODY,
  UNABLE_TO_LOAD_QUERIES_TITLE,
  getEventsCount,
  getPromoteAllCalloutTitle,
  getPromoteAllSuccessToast,
} from './translations';
import { PromoteAction } from './promote_action';
import { QueryDetailsFlyout } from './query_details_flyout';
import { formatLastOccurredAt } from './utils';

const DEFAULT_PAGINATION = { index: 0, size: 10 };
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export function QueriesTable() {
  const { euiTheme } = useEuiTheme();
  const {
    dependencies: {
      start: { unifiedSearch, share },
    },
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const { timeState } = useTimefilter();
  const [searchQuery, setSearchQuery] = useState('');

  const [pagination, setPagination] = useState<{
    index: number;
    size: number;
  }>({ ...DEFAULT_PAGINATION });

  const [selectedQuery, setSelectedQuery] = useState<SignificantEventQueryRow | null>(null);
  const {
    data: queriesData,
    isLoading: queriesLoading,
    isError: hasQueriesError,
  } = useFetchDiscoveryQueries({
    query: searchQuery,
    page: pagination.index + 1,
    perPage: pagination.size,
  });
  const { data: occurrencesData } = useFetchDiscoveryQueriesOccurrences({ query: searchQuery });
  const {
    data: streamsData,
    isLoading: streamsLoading,
    isError: hasStreamsError,
  } = useFetchStreams();
  const { count: unbackedCount } = useUnbackedQueriesCount();
  const queryClient = useQueryClient();
  const { promoteAll, upsertQuery, removeQuery } = useQueriesApi();

  const invalidateQueriesData = useCallback(
    async () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: UNBACKED_QUERIES_COUNT_QUERY_KEY }),
      ]),
    [queryClient]
  );

  const promoteAllMutation = useMutation<{ promoted: number }, Error>({
    mutationFn: promoteAll,
    onSuccess: async ({ promoted }) => {
      toasts.addSuccess(getPromoteAllSuccessToast(promoted));
      await invalidateQueriesData();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), {
        title: PROMOTE_ALL_ERROR_TOAST_TITLE,
      });
    },
  });

  const saveQueryMutation = useMutation<
    void,
    Error,
    { updatedQuery: SignificantEventQueryRow['query']; streamName: string }
  >({
    mutationFn: async ({ updatedQuery, streamName }) => {
      await upsertQuery({ query: updatedQuery, streamName });
    },
    onSuccess: async (_, variables) => {
      await invalidateQueriesData();
      setSelectedQuery((currentSelectedQuery) =>
        currentSelectedQuery !== null
          ? {
              ...currentSelectedQuery,
              query: variables.updatedQuery,
            }
          : currentSelectedQuery
      );
    },
    onError: (error) => {
      toasts.addError(error, {
        title: SAVE_QUERY_ERROR_TOAST_TITLE,
      });
    },
  });

  const deleteQueryMutation = useMutation<void, Error, { queryId: string; streamName: string }>({
    mutationFn: async ({ queryId, streamName }) => {
      await removeQuery({ queryId, streamName });
    },
    onSuccess: async () => {
      await invalidateQueriesData();
      setSelectedQuery(null);
    },
    onError: (error) => {
      toasts.addError(error, {
        title: DELETE_QUERY_ERROR_TOAST_TITLE,
      });
    },
  });

  const onTableChange = useCallback(
    ({ page }: CriteriaWithPagination<SignificantEventQueryRow>) => {
      if (!page) {
        return;
      }

      setPagination(page);
    },
    []
  );

  const tableItems = queriesData?.queries ?? [];

  const columns: Array<EuiBasicTableColumn<SignificantEventQueryRow>> = useMemo(() => {
    const streamDefinitions = streamsData?.streams ?? [];
    const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

    return [
      {
        field: 'details',
        name: '',
        width: '40px',
        render: (_: unknown, item: SignificantEventQueryRow) => (
          <EuiButtonIcon
            data-test-subj="queriesDiscoveryDetailsButton"
            iconType="expand"
            aria-label={DETAILS_BUTTON_ARIA_LABEL}
            onClick={() => setSelectedQuery(item)}
          />
        ),
      },
      {
        field: 'query.title',
        name: TITLE_COLUMN,
        render: (_: unknown, item: SignificantEventQueryRow) => (
          <EuiLink onClick={() => {}}>{item.query.title}</EuiLink>
        ),
      },
      {
        field: 'query.severity_score',
        name: IMPACT_COLUMN,
        render: (_: unknown, item: SignificantEventQueryRow) => {
          return <SeverityBadge score={item.query.severity_score} />;
        },
      },
      {
        field: 'occurrences',
        name: LAST_OCCURRED_COLUMN,
        render: (_: unknown, item: SignificantEventQueryRow) => {
          return <EuiText size="s">{formatLastOccurredAt(item.occurrences)}</EuiText>;
        },
      },
      {
        field: 'occurrences',
        name: OCCURRENCES_COLUMN,
        width: '160px',
        align: 'center',
        render: (_: unknown, item: SignificantEventQueryRow) => {
          return (
            <SparkPlot
              id={`sparkplot-${item.query.id}`}
              name={OCCURRENCES_TOOLTIP_NAME}
              type="bar"
              timeseries={item.occurrences}
              annotations={[]}
              compressed
              hideAxis
              height={32}
            />
          );
        },
      },
      {
        field: 'stream_name',
        name: STREAM_COLUMN,
        render: (_: unknown, item: SignificantEventQueryRow) => (
          <EuiBadge color="hollow">{item.stream_name}</EuiBadge>
        ),
      },
      {
        field: 'rule_backed',
        name: BACKED_STATUS_COLUMN,
        render: (_: unknown, item: SignificantEventQueryRow) => {
          return (
            <EuiToolTip
              content={item.rule_backed ? PROMOTED_TOOLTIP_CONTENT : NOT_PROMOTED_TOOLTIP_CONTENT}
            >
              <span tabIndex={0}>
                {item.rule_backed && <EuiBadge color="hollow">{PROMOTED_BADGE_LABEL}</EuiBadge>}
                {!item.rule_backed && (
                  <EuiBadge color="warning">{NOT_PROMOTED_BADGE_LABEL}</EuiBadge>
                )}
              </span>
            </EuiToolTip>
          );
        },
      },
      {
        name: ACTIONS_COLUMN_TITLE,
        actions: [
          {
            name: OPEN_IN_DISCOVER_ACTION_TITLE,
            type: 'icon',
            icon: 'discoverApp',
            description: OPEN_IN_DISCOVER_ACTION_DESCRIPTION,
            enabled: () => discoverLocator !== undefined,
            onClick: (item) => {
              const definition = streamDefinitions.find(
                (streamItem) => streamItem.stream.name === item.stream_name
              );

              if (!definition) {
                return;
              }

              discoverLocator?.navigate(
                buildDiscoverParams(item.query, definition.stream, timeState)
              );
            },
            isPrimary: true,
            'data-test-subj': 'significant_events_table_open_in_discover_action',
          },
          {
            type: 'button',
            color: 'primary',
            name: PROMOTE_QUERY_ACTION_TITLE,
            description: PROMOTE_QUERY_ACTION_DESCRIPTION,
            render: (item: SignificantEventQueryRow) => {
              return <PromoteAction item={item} />;
            },
          },
        ],
      },
    ];
  }, [share.url.locators, streamsData, timeState]);

  const isLoading = queriesLoading || streamsLoading;
  if (isLoading) {
    return <LoadingPanel size="l" />;
  }

  const hasError = hasQueriesError || hasStreamsError;
  if (hasError) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{UNABLE_TO_LOAD_QUERIES_TITLE}</h2>}
        body={<p>{UNABLE_TO_LOAD_QUERIES_BODY}</p>}
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {unbackedCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            announceOnMount
            title={getPromoteAllCalloutTitle(unbackedCount)}
            iconType="info"
            data-test-subj="queriesPromoteAllCallout"
          >
            <p>{PROMOTE_ALL_CALLOUT_DESCRIPTION}</p>
            <EuiButton
              fill
              onClick={() => promoteAllMutation.mutate()}
              isLoading={promoteAllMutation.isLoading}
              data-test-subj="queriesPromoteAllButton"
            >
              {PROMOTE_ALL_BUTTON}
            </EuiButton>
          </EuiCallOut>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <unifiedSearch.ui.SearchBar
              appName="streamsApp"
              showFilterBar={false}
              showQueryMenu={false}
              showQueryInput
              showDatePicker={false}
              submitButtonStyle="iconOnly"
              displayStyle="inPage"
              disableQueryLanguageSwitcher
              onQuerySubmit={(queryPayload) => {
                setSearchQuery(String(queryPayload.query?.query ?? ''));
                setPagination((currentPagination) => ({ index: 0, size: currentPagination.size }));
              }}
              query={{
                query: searchQuery,
                language: 'text',
              }}
              isLoading={queriesLoading}
              placeholder={SEARCH_PLACEHOLDER}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StreamsAppSearchBar showDatePicker />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder hasShadow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{CHART_TITLE}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <SparkPlot
                id="aggregated-occurrences"
                name={CHART_SERIES_NAME}
                type="bar"
                timeseries={occurrencesData?.occurrences_histogram ?? []}
                annotations={[]}
                height={180}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{getEventsCount(queriesData?.total ?? 0)}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBasicTable
          css={css`
            & thead tr {
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            }
          `}
          tableCaption={TABLE_CAPTION}
          columns={columns}
          itemId={(item) => item.query.id}
          items={tableItems}
          loading={queriesLoading || streamsLoading}
          noItemsMessage={!queriesLoading && !streamsLoading ? NO_ITEMS_MESSAGE : ''}
          pagination={{
            pageIndex: pagination.index,
            pageSize: pagination.size,
            totalItemCount: queriesData?.total ?? 0,
            pageSizeOptions: [...PAGE_SIZE_OPTIONS],
          }}
          onChange={onTableChange}
        />
      </EuiFlexItem>
      {selectedQuery && (
        <QueryDetailsFlyout
          item={selectedQuery}
          onClose={() => setSelectedQuery(null)}
          onSave={(updatedQuery, streamName) =>
            saveQueryMutation.mutateAsync({ updatedQuery, streamName })
          }
          onDelete={(queryId, streamName) =>
            deleteQueryMutation.mutateAsync({ queryId, streamName })
          }
          isSaving={saveQueryMutation.isLoading}
          isDeleting={deleteQueryMutation.isLoading}
        />
      )}
    </EuiFlexGroup>
  );
}
