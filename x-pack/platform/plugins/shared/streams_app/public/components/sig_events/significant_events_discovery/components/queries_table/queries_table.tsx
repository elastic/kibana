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
  EuiButtonEmpty,
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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { QUERY_TYPE_MATCH, QUERY_TYPE_STATS } from '@kbn/streams-schema';
import { useMutation, useQueryClient } from '@kbn/react-query';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  DISCOVERY_QUERIES_QUERY_KEY,
  useFetchDiscoveryQueries,
  type SignificantEventQueryRow,
} from '../../../../../hooks/sig_events/use_fetch_discovery_queries';
import {
  DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY,
  useFetchDiscoveryQueriesOccurrences,
} from '../../../../../hooks/sig_events/use_fetch_discovery_queries_occurrences';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useQueriesApi, type PromoteResult } from '../../../../../hooks/sig_events/use_queries_api';
import { useDiscoveryQueriesApi } from '../../../../../hooks/sig_events/use_discovery_queries_api';
import type { BulkOperationResult } from '../../../../../hooks/sig_events/use_discovery_features_api';
import {
  HIGH_SEVERITY_THRESHOLD,
  UNBACKED_QUERIES_COUNT_QUERY_KEY,
  useUnbackedQueriesCount,
} from '../../../../../hooks/sig_events/use_unbacked_queries_count';
import { getFormattedError } from '../../../../../util/errors';
import { AssetImage } from '../../../../asset_image';
import { useStreamsAppRouter } from '../../../../../hooks/use_streams_app_router';
import { LoadingPanel } from '../../../../loading_panel';
import { SparkPlot } from '../../../../spark_plot';
import { StreamsAppSearchBar } from '../../../../streams_app_search_bar';
import { SeverityBadge } from '../severity_badge/severity_badge';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { buildDiscoverParams } from '../../utils/discover_helpers';
import {
  ACTIONS_COLUMN_TITLE,
  BACKED_STATUS_COLUMN,
  CHART_SERIES_NAME,
  CHART_TITLE,
  CREATE_RULES_BUTTON,
  DELETE_QUERY_ERROR_TOAST_TITLE,
  DETAILS_BUTTON_ARIA_LABEL,
  IMPACT_COLUMN,
  LAST_OCCURRED_COLUMN,
  NO_ITEMS_MESSAGE,
  NOT_PROMOTED_BADGE_LABEL,
  NOT_PROMOTED_TOOLTIP_CONTENT,
  OCCURRENCES_COLUMN,
  OCCURRENCES_TOOLTIP_NAME,
  THRESHOLD_BREACHES_TOOLTIP_NAME,
  OPEN_IN_DISCOVER_ACTION_DESCRIPTION,
  OPEN_IN_DISCOVER_ACTION_TITLE,
  PROMOTED_BADGE_LABEL,
  PROMOTED_TOOLTIP_CONTENT,
  PROMOTE_ALL_ERROR_TOAST_TITLE,
  PROMOTE_QUERY_ACTION_DESCRIPTION,
  PROMOTE_QUERY_ACTION_TITLE,
  getRuleCountLabel,
  SAVE_QUERY_ERROR_TOAST_TITLE,
  SEARCH_PLACEHOLDER,
  STREAM_COLUMN,
  TABLE_CAPTION,
  TITLE_COLUMN,
  STATS_DRAFT_BADGE_LABEL,
  STATS_LAST_OCCURRED_PLACEHOLDER,
  STATS_NOT_PROMOTED_TOOLTIP_CONTENT,
  UNABLE_TO_LOAD_QUERIES_BODY,
  UNABLE_TO_LOAD_QUERIES_TITLE,
  getEventsCount,
  getPromoteAllSuccessToast,
  CLEAR_SELECTION_LABEL,
  DELETE_SELECTED_LABEL,
  PROMOTE_SELECTED_LABEL,
  getSelectedCountLabel,
  DELETE_QUERIES_MODAL_TITLE,
  BULK_DELETE_SUCCESS_MESSAGE,
  BULK_DELETE_ALL_FAILED_MESSAGE,
  BULK_DELETE_PARTIAL_MESSAGE,
  BULK_DELETE_ERROR_TITLE,
  BULK_PROMOTE_ERROR_TITLE,
} from './translations';
import { DeleteQueriesModal } from './delete_queries_modal';
import { PromoteAction } from './promote_action';
import { QueryDetailsFlyout } from './query_details_flyout';
import { QueryTypeBadge } from '../query_type_badge/query_type_badge';
import { formatLastOccurredAt } from './utils';

const DEFAULT_PAGINATION = { index: 0, size: 10 };
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export function QueriesTable() {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();
  const {
    dependencies: {
      start: { share },
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

  const handleSelectQuery = useCallback((item: SignificantEventQueryRow) => {
    setSelectedQuery((prev) => (prev?.query.id === item.query.id ? null : item));
  }, []);
  const {
    data: queriesData,
    isLoading: queriesLoading,
    isError: hasQueriesError,
  } = useFetchDiscoveryQueries({
    query: searchQuery,
    page: pagination.index + 1,
    perPage: pagination.size,
    status: ['active', 'draft'],
  });
  const queriesList = queriesData?.queries;
  useEffect(() => {
    if (!queriesList) return;
    setSelectedQuery((prev) => {
      if (!prev) return null;
      return queriesList.find((q) => q.query.id === prev.query.id) ?? null;
    });
  }, [queriesList, setSelectedQuery]);

  useEffect(() => {
    setSelectedItems([]);
  }, [timeState.start, timeState.end]);

  const { data: occurrencesData } = useFetchDiscoveryQueriesOccurrences({ query: searchQuery });

  const { count: unbackedCount } = useUnbackedQueriesCount();
  const queryClient = useQueryClient();
  const { promoteAll, promote, upsertQuery, removeQuery } = useQueriesApi();
  const { deleteQueriesInBulk } = useDiscoveryQueriesApi();

  const [selectedItems, setSelectedItems] = useState<SignificantEventQueryRow[]>([]);
  const [itemsToDelete, setItemsToDelete] = useState<SignificantEventQueryRow[]>([]);

  const isSelectionEmpty = selectedItems.length === 0;
  const unbackedNonStatsSelected = useMemo(
    () => selectedItems.filter((item) => !item.rule_backed && item.query.type !== QUERY_TYPE_STATS),
    [selectedItems]
  );
  const hasPromotableSelected = unbackedNonStatsSelected.length > 0;

  const invalidateQueriesData = useCallback(
    async () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: UNBACKED_QUERIES_COUNT_QUERY_KEY }),
      ]),
    [queryClient]
  );

  const bulkDeleteMutation = useMutation<BulkOperationResult, Error, SignificantEventQueryRow[]>({
    mutationFn: (items) => deleteQueriesInBulk(items),
    onSuccess: async ({ succeededCount, failedCount }) => {
      setSelectedItems([]);
      setItemsToDelete([]);
      await invalidateQueriesData();

      if (failedCount === 0) {
        toasts.addSuccess(BULK_DELETE_SUCCESS_MESSAGE(succeededCount));
      } else if (succeededCount === 0) {
        toasts.addDanger(BULK_DELETE_ALL_FAILED_MESSAGE);
      } else {
        toasts.addWarning(BULK_DELETE_PARTIAL_MESSAGE(succeededCount, failedCount));
      }
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: BULK_DELETE_ERROR_TITLE });
    },
  });

  const bulkPromoteMutation = useMutation<PromoteResult, Error, SignificantEventQueryRow[]>({
    mutationFn: (items) => {
      const queryIds = items.map((item) => item.query.id);
      return promote({ queryIds });
    },
    onSuccess: async ({ promoted, skipped_stats: skippedStats }) => {
      setSelectedItems([]);
      await invalidateQueriesData();

      const toast = getPromoteAllSuccessToast(promoted, skippedStats);
      if (toast.severity === 'info') {
        toasts.add({ title: toast.text, color: 'primary' });
      } else {
        toasts.addSuccess(toast.text);
      }
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: BULK_PROMOTE_ERROR_TITLE });
    },
  });

  const promoteAllMutation = useMutation<PromoteResult, Error>({
    mutationFn: () => promoteAll({ minSeverityScore: HIGH_SEVERITY_THRESHOLD }),
    mutationKey: ['promoteAll'],
    onSuccess: async ({ promoted, skipped_stats: skippedStats }) => {
      const toast = getPromoteAllSuccessToast(promoted, skippedStats);
      if (toast.severity === 'info') {
        toasts.add({ title: toast.text, color: 'primary' });
      } else {
        toasts.addSuccess(toast.text);
      }
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
    onSuccess: async (_, { queryId }) => {
      await invalidateQueriesData();
      setSelectedQuery(null);
      setSelectedItems((prev) => prev.filter((item) => item.query.id !== queryId));
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
      setSelectedItems([]);
    },
    []
  );

  const tableItems = queriesData?.queries ?? [];

  const columns: Array<EuiBasicTableColumn<SignificantEventQueryRow>> = useMemo(() => {
    const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

    return [
      {
        field: 'details',
        name: '',
        width: '40px',
        render: (_: unknown, item: SignificantEventQueryRow) => {
          const isSelected = selectedQuery?.query.id === item.query.id;
          return (
            <EuiButtonIcon
              data-test-subj="queriesDiscoveryDetailsButton"
              iconType={isSelected ? 'minimize' : 'maximize'}
              aria-label={DETAILS_BUTTON_ARIA_LABEL}
              onClick={() => handleSelectQuery(item)}
            />
          );
        },
      },
      {
        field: 'query.title',
        name: TITLE_COLUMN,
        truncateText: true,
        render: (_: unknown, item: SignificantEventQueryRow) => (
          <EuiLink onClick={() => handleSelectQuery(item)}>{item.query.title}</EuiLink>
        ),
      },
      {
        field: 'query.severity_score',
        name: IMPACT_COLUMN,
        width: '100px',
        render: (_: unknown, item: SignificantEventQueryRow) => {
          return <SeverityBadge score={item.query.severity_score} />;
        },
      },
      {
        field: 'occurrences',
        name: LAST_OCCURRED_COLUMN,
        width: '240px',
        render: (_: unknown, item: SignificantEventQueryRow) => {
          if (item.query.type === QUERY_TYPE_STATS && !item.rule_backed) {
            return (
              <EuiText size="s" color="subdued">
                {STATS_LAST_OCCURRED_PLACEHOLDER}
              </EuiText>
            );
          }
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
              name={
                item.query.type === QUERY_TYPE_STATS
                  ? THRESHOLD_BREACHES_TOOLTIP_NAME
                  : OCCURRENCES_TOOLTIP_NAME
              }
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
        field: 'query.type',
        name: i18n.translate('xpack.streams.queriesTable.typeColumn', {
          defaultMessage: 'Type',
        }),
        width: '80px',
        render: (_: unknown, item: SignificantEventQueryRow) => (
          <QueryTypeBadge type={item.query.type ?? QUERY_TYPE_MATCH} />
        ),
      },
      {
        field: 'stream_name',
        name: STREAM_COLUMN,
        width: '130px',
        render: (_: unknown, item: SignificantEventQueryRow) => (
          <EuiBadge color="hollow">{item.stream_name}</EuiBadge>
        ),
      },
      {
        field: 'rule_backed',
        name: BACKED_STATUS_COLUMN,
        width: '120px',
        render: (_: unknown, item: SignificantEventQueryRow) => {
          const isStats = item.query.type === QUERY_TYPE_STATS;
          if (item.rule_backed) {
            return (
              <EuiToolTip content={PROMOTED_TOOLTIP_CONTENT}>
                <span tabIndex={0}>
                  <EuiBadge color="hollow">{PROMOTED_BADGE_LABEL}</EuiBadge>
                </span>
              </EuiToolTip>
            );
          }
          if (isStats) {
            return (
              <EuiToolTip content={STATS_NOT_PROMOTED_TOOLTIP_CONTENT}>
                <span tabIndex={0}>
                  <EuiBadge color="default">{STATS_DRAFT_BADGE_LABEL}</EuiBadge>
                </span>
              </EuiToolTip>
            );
          }
          return (
            <EuiToolTip content={NOT_PROMOTED_TOOLTIP_CONTENT}>
              <span tabIndex={0}>
                <EuiBadge color="warning">{NOT_PROMOTED_BADGE_LABEL}</EuiBadge>
              </span>
            </EuiToolTip>
          );
        },
      },
      {
        name: ACTIONS_COLUMN_TITLE,
        width: '100px',
        actions: [
          {
            name: OPEN_IN_DISCOVER_ACTION_TITLE,
            type: 'icon',
            icon: 'discoverApp',
            description: OPEN_IN_DISCOVER_ACTION_DESCRIPTION,
            enabled: () => discoverLocator !== undefined,
            onClick: (item: SignificantEventQueryRow) => {
              discoverLocator?.navigate(buildDiscoverParams(item.query, timeState));
            },
            isPrimary: true,
            'data-test-subj': 'significant_events_table_open_in_discover_action',
          },
          {
            type: 'button',
            color: 'primary',
            name: PROMOTE_QUERY_ACTION_TITLE,
            description: PROMOTE_QUERY_ACTION_DESCRIPTION,
            render: (item: SignificantEventQueryRow) => <PromoteAction item={item} />,
          },
        ],
      },
    ];
  }, [share.url.locators, timeState, selectedQuery, handleSelectQuery]);

  const isLoading = queriesLoading;
  if (isLoading) {
    return <LoadingPanel size="l" />;
  }

  const hasError = hasQueriesError;
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

  const isEmpty = !queriesLoading && (queriesData?.total ?? 0) === 0 && !searchQuery;
  if (isEmpty) {
    return (
      <EuiEmptyPrompt
        aria-live="polite"
        titleSize="xs"
        icon={<AssetImage type="significantEventsEmptyState" />}
        title={
          <h2>
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.queriesTable.emptyState.title',
              { defaultMessage: 'Rules' }
            )}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.queriesTable.emptyState.description',
              {
                defaultMessage:
                  'Once your streams data are onboarded, rules will be proposed for promotion. Promoting a rule activates it — matched events feed directly into Significant Events.',
              }
            )}
          </p>
        }
        actions={
          <EuiButtonEmpty href={router.link('/_discovery/{tab}', { path: { tab: 'streams' } })}>
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.queriesTable.emptyState.goToStreamsButton',
              { defaultMessage: 'Go to Streams tab' }
            )}
          </EuiButtonEmpty>
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {unbackedCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            color="primary"
            size="s"
            announceOnMount={false}
            data-test-subj="queriesPromoteAllCallout"
          >
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <AssetImage type="significantEventsEmptyState" size={62} />
              </EuiFlexItem>
              <EuiFlexItem grow>
                <EuiText size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.streams.significantEventsDiscovery.queriesTable.promoteAllCalloutMessage"
                      defaultMessage="Based on severity, we recommend creating {ruleCount} based on the last run."
                      values={{
                        ruleCount: <strong>{getRuleCountLabel(unbackedCount)}</strong>,
                      }}
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="primary"
                  size="s"
                  onClick={() => promoteAllMutation.mutate()}
                  isLoading={promoteAllMutation.isLoading}
                  data-test-subj="queriesPromoteAllButton"
                >
                  {CREATE_RULES_BUTTON}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <StreamsAppSearchBar
          isLoading={queriesLoading}
          onQuerySubmit={(queryPayload) => {
            setSearchQuery(String(queryPayload.query?.query ?? ''));
            setPagination((currentPagination) => ({ index: 0, size: currentPagination.size }));
            setSelectedItems([]);
          }}
          placeholder={SEARCH_PLACEHOLDER}
          query={{
            query: searchQuery,
            language: 'text',
          }}
          showDatePicker
          showQueryInput
          submitButtonStyle="iconOnly"
        />
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
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="s">{getEventsCount(queriesData?.total ?? 0)}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              size="xs"
              aria-label={CLEAR_SELECTION_LABEL}
              isDisabled={isSelectionEmpty}
              onClick={() => setSelectedItems([])}
            >
              {CLEAR_SELECTION_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="trash"
              color="danger"
              size="xs"
              isDisabled={isSelectionEmpty || bulkDeleteMutation.isLoading}
              isLoading={bulkDeleteMutation.isLoading}
              onClick={() => setItemsToDelete(selectedItems)}
            >
              {DELETE_SELECTED_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="plusInCircle"
              size="xs"
              isDisabled={!hasPromotableSelected || bulkPromoteMutation.isLoading}
              isLoading={bulkPromoteMutation.isLoading}
              onClick={() => bulkPromoteMutation.mutate(unbackedNonStatsSelected)}
            >
              {PROMOTE_SELECTED_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {!isSelectionEmpty && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {getSelectedCountLabel(selectedItems.length)}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
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
          rowProps={(item: SignificantEventQueryRow) => ({
            isSelected: selectedQuery?.query.id === item.query.id,
          })}
          loading={queriesLoading}
          noItemsMessage={!queriesLoading ? NO_ITEMS_MESSAGE : ''}
          pagination={{
            pageIndex: pagination.index,
            pageSize: pagination.size,
            totalItemCount: queriesData?.total ?? 0,
            pageSizeOptions: [...PAGE_SIZE_OPTIONS],
          }}
          onChange={onTableChange}
          selection={{
            selected: selectedItems,
            onSelectionChange: setSelectedItems,
          }}
        />
      </EuiFlexItem>
      {itemsToDelete.length > 0 && (
        <DeleteQueriesModal
          title={DELETE_QUERIES_MODAL_TITLE(itemsToDelete.length)}
          items={itemsToDelete}
          onCancel={() => setItemsToDelete([])}
          onConfirm={() => bulkDeleteMutation.mutate(itemsToDelete)}
          isLoading={bulkDeleteMutation.isLoading}
        />
      )}
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
