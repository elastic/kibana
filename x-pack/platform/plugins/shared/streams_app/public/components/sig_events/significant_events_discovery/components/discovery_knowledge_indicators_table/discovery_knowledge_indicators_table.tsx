/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import { COMPUTED_FEATURE_TYPES, isComputedFeature } from '@kbn/streams-schema';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useFetchDiscoveryKnowledgeIndicators } from '../../../../../hooks/sig_events/use_fetch_discovery_knowledge_indicators';
import { useDiscoveryFeaturesApi } from '../../../../../hooks/sig_events/use_discovery_features_api';
import { useDiscoveryKnowledgeIndicatorsBulkDelete } from '../../../../../hooks/sig_events/use_discovery_knowledge_indicators_bulk_delete';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../../../../hooks/use_streams_app_router';
import { AssetImage } from '../../../../asset_image';
import { LoadingPanel } from '../../../../loading_panel';
import { SparkPlot } from '../../../../spark_plot';
import { TableTitle } from '../../../stream_detail_systems/table_title';
import { getConfidenceColor } from '../../../stream_detail_systems/stream_features/use_stream_features_table';
import { KnowledgeIndicatorActionsCell } from '../../../stream_detail_significant_events_view/knowledge_indicator_actions_cell';
import { KnowledgeIndicatorDetailsFlyout } from '../../../stream_detail_significant_events_view/knowledge_indicator_details_flyout';
import { DeleteTableItemsModal } from '../../../stream_detail_significant_events_view/delete_table_items_modal';
import { KnowledgeIndicatorsTypeFilter } from '../../../stream_detail_significant_events_view/knowledge_indicators_type_filter';
import { KnowledgeIndicatorsStatusFilter } from '../../../stream_detail_significant_events_view/knowledge_indicators_status_filter';
import { getKnowledgeIndicatorItemId } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_item_id';
import { DiscoveryStreamFilter } from '../discovery_stream_filter';

const SEARCH_DEBOUNCE_MS = 300;

const getKnowledgeIndicatorTitle = (ki: KnowledgeIndicator): string =>
  ki.kind === 'feature' ? ki.feature.title ?? ki.feature.id : ki.query.title ?? ki.query.id;

export function DiscoveryKnowledgeIndicatorsTable() {
  const router = useStreamsAppRouter();
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();

  const { knowledgeIndicators, occurrencesByQueryId, isLoading, isEmpty, refetch } =
    useFetchDiscoveryKnowledgeIndicators();
  const { excludeFeaturesInBulk, restoreFeaturesInBulk } = useDiscoveryFeaturesApi();

  const [tableSearchValue, setTableSearchValue] = useState('');
  const debouncedSearchTerm = useDebouncedValue(tableSearchValue, SEARCH_DEBOUNCE_MS);
  const [statusFilter, setStatusFilter] = useState<'active' | 'excluded'>('active');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [showComputed, setShowComputed] = useState(false);

  const [selectedKnowledgeIndicator, setSelectedKnowledgeIndicator] =
    useState<KnowledgeIndicator | null>(null);
  const [selectedKnowledgeIndicators, setSelectedKnowledgeIndicators] = useState<
    KnowledgeIndicator[]
  >([]);
  const [knowledgeIndicatorsToDelete, setKnowledgeIndicatorsToDelete] = useState<
    KnowledgeIndicator[]
  >([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const { deleteKnowledgeIndicatorsInBulk, isDeleting } = useDiscoveryKnowledgeIndicatorsBulkDelete(
    {
      onSuccess: () => {
        setSelectedKnowledgeIndicators([]);
        setKnowledgeIndicatorsToDelete([]);
      },
    }
  );

  const [isBulkOperationInProgress, setIsBulkOperationInProgress] = useState(false);

  const selectedKnowledgeIndicatorId = selectedKnowledgeIndicator
    ? getKnowledgeIndicatorItemId(selectedKnowledgeIndicator)
    : undefined;

  const filteredKnowledgeIndicators = useMemo(() => {
    const normalizedSearchTerm = debouncedSearchTerm.trim().toLowerCase();

    const filtered = knowledgeIndicators.filter((ki) => {
      const matchesStatusFilter =
        statusFilter === 'active'
          ? ki.kind === 'query' || !ki.feature.excluded_at
          : ki.kind === 'feature' && Boolean(ki.feature.excluded_at);

      if (!matchesStatusFilter) {
        return false;
      }

      const type = ki.kind === 'feature' ? ki.feature.type : 'query';
      if (selectedTypes.length > 0 && !selectedTypes.includes(type)) {
        return false;
      }

      const streamName = ki.kind === 'feature' ? ki.feature.stream_name : ki.stream_name;
      if (selectedStreams.length > 0 && !selectedStreams.includes(streamName)) {
        return false;
      }

      if (!showComputed && ki.kind === 'feature' && isComputedFeature(ki.feature)) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const title =
        ki.kind === 'feature'
          ? (ki.feature.title ?? '').toLowerCase()
          : (ki.query.title ?? '').toLowerCase();

      return title.includes(normalizedSearchTerm);
    });

    return filtered.sort((a, b) =>
      getKnowledgeIndicatorTitle(a)
        .toLowerCase()
        .localeCompare(getKnowledgeIndicatorTitle(b).toLowerCase())
    );
  }, [
    knowledgeIndicators,
    debouncedSearchTerm,
    statusFilter,
    selectedTypes,
    selectedStreams,
    showComputed,
  ]);

  useEffect(() => {
    setPagination((current) => {
      if (current.pageIndex === 0) return current;
      return { ...current, pageIndex: 0 };
    });
  }, [debouncedSearchTerm, statusFilter, selectedTypes, selectedStreams, showComputed]);

  const toggleSelectedKnowledgeIndicator = useCallback((ki: KnowledgeIndicator) => {
    setSelectedKnowledgeIndicator((current) => {
      if (!current) return ki;
      return getKnowledgeIndicatorItemId(current) === getKnowledgeIndicatorItemId(ki) ? null : ki;
    });
  }, []);

  const handleTableChange = useCallback(({ page }: CriteriaWithPagination<KnowledgeIndicator>) => {
    if (!page) return;
    setPagination({ pageIndex: page.index, pageSize: page.size });
  }, []);

  const executeBulkFeatureOperation = useCallback(
    async (
      operation: typeof excludeFeaturesInBulk,
      successTitle: string,
      partialTitle: string,
      errorTitle: string
    ) => {
      const features = selectedKnowledgeIndicators
        .filter((ki) => ki.kind === 'feature')
        .map((ki) => ki.feature);

      if (features.length === 0) return;

      setIsBulkOperationInProgress(true);
      try {
        const { failedCount } = await operation(features);
        if (failedCount === 0) {
          toasts.addSuccess({ title: successTitle });
        } else {
          toasts.addWarning({ title: partialTitle });
        }
        setSelectedKnowledgeIndicators([]);
      } catch (error) {
        toasts.addError(error instanceof Error ? error : new Error(String(error)), {
          title: errorTitle,
        });
      } finally {
        setIsBulkOperationInProgress(false);
        refetch();
      }
    },
    [selectedKnowledgeIndicators, toasts, refetch]
  );

  const handleBulkExclude = useCallback(
    () =>
      executeBulkFeatureOperation(
        excludeFeaturesInBulk,
        BULK_EXCLUDE_SUCCESS_TOAST_TITLE,
        BULK_EXCLUDE_PARTIAL_TOAST_TITLE,
        BULK_EXCLUDE_ERROR_TOAST_TITLE
      ),
    [executeBulkFeatureOperation, excludeFeaturesInBulk]
  );

  const handleBulkRestore = useCallback(
    () =>
      executeBulkFeatureOperation(
        restoreFeaturesInBulk,
        BULK_RESTORE_SUCCESS_TOAST_TITLE,
        BULK_RESTORE_PARTIAL_TOAST_TITLE,
        BULK_RESTORE_ERROR_TOAST_TITLE
      ),
    [executeBulkFeatureOperation, restoreFeaturesInBulk]
  );

  const [isRowActionInProgress, setIsRowActionInProgress] = useState(false);

  // Single-row actions (exclude/restore) invalidate query caches, which refetches data and may
  // unmount the KnowledgeIndicatorActionsCell mid-operation. When that happens, the mutation
  // observer's onSettled callback never fires, leaving isRowActionInProgress stuck at true.
  // Resetting on data change guarantees cleanup after every successful refetch.
  useEffect(() => {
    setIsRowActionInProgress(false);
  }, [knowledgeIndicators]);

  const isOperationInProgress = isDeleting || isBulkOperationInProgress || isRowActionInProgress;
  const selectionContainsQueries = selectedKnowledgeIndicators.some((ki) => ki.kind === 'query');
  const selectionContainsComputed = selectedKnowledgeIndicators.some(
    (ki) => ki.kind === 'feature' && isComputedFeature(ki.feature)
  );
  const selectionContainsNonExcludable = selectionContainsQueries || selectionContainsComputed;
  const isSelectionActionsDisabled =
    selectedKnowledgeIndicators.length === 0 || isOperationInProgress;

  const columns = useMemo<Array<EuiBasicTableColumn<KnowledgeIndicator>>>(
    () => [
      {
        name: TITLE_COLUMN_LABEL,
        render: (ki: KnowledgeIndicator) => {
          const title =
            ki.kind === 'feature'
              ? ki.feature.title ?? ki.feature.id
              : ki.query.title ?? ki.query.id;

          const isExpanded = selectedKnowledgeIndicatorId === getKnowledgeIndicatorItemId(ki);

          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  data-test-subj="discoveryKnowledgeIndicatorsDetailsButton"
                  iconType={isExpanded ? 'minimize' : 'expand'}
                  aria-label={isExpanded ? MINIMIZE_DETAILS_ARIA_LABEL : VIEW_DETAILS_ARIA_LABEL}
                  onClick={() => toggleSelectedKnowledgeIndicator(ki)}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink onClick={() => toggleSelectedKnowledgeIndicator(ki)}>{title}</EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        name: EVENTS_COLUMN_LABEL,
        width: '160px',
        render: (ki: KnowledgeIndicator) => {
          if (ki.kind !== 'query' || !ki.rule.backed) {
            return null;
          }

          const occurrences = occurrencesByQueryId[ki.query.id];
          if (!occurrences) return null;

          return (
            <SparkPlot
              id={`discovery-ki-events-${ki.query.id}`}
              name={OCCURRENCES_TOOLTIP_NAME}
              type="bar"
              timeseries={occurrences}
              annotations={[]}
              compressed
              hideAxis
              height={32}
            />
          );
        },
      },
      {
        name: TYPE_COLUMN_LABEL,
        width: '200px',
        render: (ki: KnowledgeIndicator) => {
          if (ki.kind === 'feature') {
            return (
              <EuiBadge
                color="hollow"
                css={css`
                  text-transform: capitalize;
                `}
              >
                {ki.feature.type}
              </EuiBadge>
            );
          }
          return <EuiBadge color="hollow">{QUERY_TYPE_LABEL}</EuiBadge>;
        },
      },
      {
        name: CONFIDENCE_COLUMN_LABEL,
        width: '12%',
        render: (ki: KnowledgeIndicator) => {
          if (ki.kind !== 'feature') return null;
          return (
            <EuiHealth color={getConfidenceColor(ki.feature.confidence)}>
              {ki.feature.confidence}
            </EuiHealth>
          );
        },
      },
      {
        name: STREAM_COLUMN_LABEL,
        width: '15%',
        render: (ki: KnowledgeIndicator) => {
          const streamName = ki.kind === 'feature' ? ki.feature.stream_name : ki.stream_name;
          return <EuiBadge color="hollow">{streamName}</EuiBadge>;
        },
      },
      {
        name: ACTIONS_COLUMN_LABEL,
        width: '80px',
        align: 'right',
        render: (ki: KnowledgeIndicator) => (
          <KnowledgeIndicatorActionsCell
            knowledgeIndicator={ki}
            onDeleteRequest={(item) => setKnowledgeIndicatorsToDelete([item])}
            onActionStateChange={setIsRowActionInProgress}
          />
        ),
      },
    ],
    [occurrencesByQueryId, selectedKnowledgeIndicatorId, toggleSelectedKnowledgeIndicator]
  );

  if (isLoading) {
    return <LoadingPanel size="l" />;
  }

  if (!isLoading && isEmpty) {
    return (
      <EuiEmptyPrompt
        aria-live="polite"
        titleSize="xs"
        icon={<AssetImage type="knowledgeIndicatorsEmptyState" />}
        title={<h2>{EMPTY_STATE_TITLE}</h2>}
        body={<p>{EMPTY_STATE_DESCRIPTION}</p>}
        actions={
          <EuiButtonEmpty href={router.link('/_discovery/{tab}', { path: { tab: 'streams' } })}>
            {EMPTY_STATE_GO_TO_STREAMS}
          </EuiButtonEmpty>
        }
      />
    );
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={true}>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={css`
          width: 100%;
          min-height: 44px;
        `}
      >
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            value={tableSearchValue}
            onChange={(event) => setTableSearchValue(event.target.value)}
            placeholder={SEARCH_PLACEHOLDER}
            aria-label={SEARCH_ARIA_LABEL}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <KnowledgeIndicatorsStatusFilter
            knowledgeIndicators={knowledgeIndicators}
            searchTerm={debouncedSearchTerm}
            selectedTypes={selectedTypes}
            selectedStreams={selectedStreams}
            showComputed={showComputed}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <KnowledgeIndicatorsTypeFilter
            knowledgeIndicators={knowledgeIndicators}
            searchTerm={debouncedSearchTerm}
            statusFilter={statusFilter}
            selectedTypes={selectedTypes}
            onSelectedTypesChange={setSelectedTypes}
            hideComputedTypes={!showComputed}
            selectedStreams={selectedStreams}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DiscoveryStreamFilter
            knowledgeIndicators={knowledgeIndicators}
            searchTerm={debouncedSearchTerm}
            statusFilter={statusFilter}
            selectedTypes={selectedTypes}
            showComputed={showComputed}
            selectedStreams={selectedStreams}
            onSelectedStreamsChange={setSelectedStreams}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={SHOW_COMPUTED_LABEL}
            checked={showComputed}
            onChange={(e) => {
              const checked = e.target.checked;
              setShowComputed(checked);
              if (!checked) {
                setSelectedTypes((current) =>
                  current.filter(
                    (type) => !(COMPUTED_FEATURE_TYPES as readonly string[]).includes(type)
                  )
                );
              }
            }}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <TableTitle
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            total={filteredKnowledgeIndicators.length}
            label={TABLE_LABEL}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            size="xs"
            aria-label={CLEAR_SELECTION_LABEL}
            isDisabled={isSelectionActionsDisabled}
            onClick={() => setSelectedKnowledgeIndicators([])}
          >
            {CLEAR_SELECTION_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {statusFilter === 'active' ? (
          <EuiFlexItem grow={false}>
            {(() => {
              const button = (
                <EuiButtonEmpty
                  iconType="eyeClosed"
                  color="warning"
                  size="xs"
                  aria-label={EXCLUDE_SELECTED_LABEL}
                  isLoading={isBulkOperationInProgress}
                  isDisabled={isSelectionActionsDisabled || selectionContainsNonExcludable}
                  onClick={handleBulkExclude}
                >
                  {EXCLUDE_SELECTED_LABEL}
                </EuiButtonEmpty>
              );
              return selectionContainsNonExcludable ? (
                <EuiToolTip content={CANNOT_EXCLUDE_SELECTION_TOOLTIP}>{button}</EuiToolTip>
              ) : (
                button
              );
            })()}
          </EuiFlexItem>
        ) : (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="eye"
              size="xs"
              aria-label={RESTORE_SELECTED_LABEL}
              isLoading={isBulkOperationInProgress}
              isDisabled={isSelectionActionsDisabled}
              onClick={handleBulkRestore}
            >
              {RESTORE_SELECTED_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="trash"
            color="danger"
            size="xs"
            aria-label={DELETE_SELECTED_LABEL}
            isLoading={isDeleting}
            isDisabled={isSelectionActionsDisabled}
            onClick={() => setKnowledgeIndicatorsToDelete(selectedKnowledgeIndicators)}
          >
            {DELETE_SELECTED_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <div
        css={
          isOperationInProgress
            ? css`
                pointer-events: none;
                opacity: 0.6;
              `
            : undefined
        }
      >
        <EuiInMemoryTable<KnowledgeIndicator>
          items={filteredKnowledgeIndicators}
          itemId={getKnowledgeIndicatorItemId}
          columns={columns}
          loading={isOperationInProgress}
          selection={{
            selected: selectedKnowledgeIndicators,
            onSelectionChange: setSelectedKnowledgeIndicators,
          }}
          pagination={{
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
            pageSizeOptions: [25, 50, 100],
          }}
          onTableChange={handleTableChange}
          tableCaption={TABLE_CAPTION}
          noItemsMessage={!isLoading ? NO_ITEMS_MESSAGE : ''}
        />
      </div>
      {selectedKnowledgeIndicator ? (
        <KnowledgeIndicatorDetailsFlyout
          knowledgeIndicator={selectedKnowledgeIndicator}
          occurrencesByQueryId={occurrencesByQueryId}
          onClose={() => setSelectedKnowledgeIndicator(null)}
        />
      ) : null}
      {knowledgeIndicatorsToDelete.length > 0 ? (
        <DeleteTableItemsModal
          title={DELETE_MODAL_TITLE(knowledgeIndicatorsToDelete.length)}
          items={knowledgeIndicatorsToDelete}
          onCancel={() => setKnowledgeIndicatorsToDelete([])}
          onConfirm={() => {
            void deleteKnowledgeIndicatorsInBulk(knowledgeIndicatorsToDelete);
          }}
          isLoading={isDeleting}
        />
      ) : null}
    </EuiPanel>
  );
}

const TITLE_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.titleLabel',
  { defaultMessage: 'Knowledge Indicator' }
);

const EVENTS_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.eventsLabel',
  { defaultMessage: 'Events' }
);

const TYPE_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.typeLabel',
  { defaultMessage: 'Type' }
);

const QUERY_TYPE_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.queryTypeLabel',
  { defaultMessage: 'Query' }
);

const CONFIDENCE_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.confidenceLabel',
  { defaultMessage: 'Confidence' }
);

const STREAM_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.streamLabel',
  { defaultMessage: 'Stream' }
);

const ACTIONS_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.actionsLabel',
  { defaultMessage: 'Actions' }
);

const VIEW_DETAILS_ARIA_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.viewDetailsAriaLabel',
  { defaultMessage: 'View details' }
);

const MINIMIZE_DETAILS_ARIA_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.minimizeDetailsAriaLabel',
  { defaultMessage: 'Collapse details' }
);

const OCCURRENCES_TOOLTIP_NAME = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.occurrencesTooltipName',
  { defaultMessage: 'Detected event occurrences' }
);

const TABLE_CAPTION = i18n.translate('xpack.streams.discoveryKnowledgeIndicators.tableCaption', {
  defaultMessage: 'Knowledge Indicators table',
});

const TABLE_LABEL = i18n.translate('xpack.streams.discoveryKnowledgeIndicators.tableLabel', {
  defaultMessage: 'Knowledge indicators',
});

const NO_ITEMS_MESSAGE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.noItemsMessage',
  { defaultMessage: 'No knowledge indicators found' }
);

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.searchPlaceholder',
  { defaultMessage: 'Search knowledge indicators' }
);

const SEARCH_ARIA_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.searchAriaLabel',
  { defaultMessage: 'Search knowledge indicators' }
);

const SHOW_COMPUTED_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.showComputedLabel',
  { defaultMessage: 'Show computed features' }
);

const CLEAR_SELECTION_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.clearSelectionLabel',
  { defaultMessage: 'Clear selection' }
);

const DELETE_SELECTED_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.deleteSelectedLabel',
  { defaultMessage: 'Delete selected' }
);

const EXCLUDE_SELECTED_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.excludeSelectedLabel',
  { defaultMessage: 'Exclude selected' }
);

const RESTORE_SELECTED_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.restoreSelectedLabel',
  { defaultMessage: 'Restore selected' }
);

const EMPTY_STATE_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.emptyState.title',
  { defaultMessage: 'Knowledge indicators' }
);

const EMPTY_STATE_DESCRIPTION = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.emptyState.description',
  {
    defaultMessage:
      'Facts about your stream automatically extracted from log data to power rule generation. To generate knowledge indicators, go to Streams tab and start onboarding.',
  }
);

const EMPTY_STATE_GO_TO_STREAMS = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.emptyState.goToStreamsButton',
  { defaultMessage: 'Go to Streams tab' }
);

const CANNOT_EXCLUDE_SELECTION_TOOLTIP = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.cannotExcludeSelectionTooltip',
  {
    defaultMessage:
      'Queries and computed features cannot be excluded. Deselect them to enable this action.',
  }
);

const BULK_EXCLUDE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkExcludeSuccessToastTitle',
  { defaultMessage: 'Knowledge indicators excluded' }
);

const BULK_EXCLUDE_PARTIAL_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkExcludePartialToastTitle',
  { defaultMessage: 'Some knowledge indicators could not be excluded' }
);

const BULK_EXCLUDE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkExcludeErrorToastTitle',
  { defaultMessage: 'Failed to exclude knowledge indicators' }
);

const BULK_RESTORE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkRestoreSuccessToastTitle',
  { defaultMessage: 'Knowledge indicators restored' }
);

const BULK_RESTORE_PARTIAL_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkRestorePartialToastTitle',
  { defaultMessage: 'Some knowledge indicators could not be restored' }
);

const BULK_RESTORE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkRestoreErrorToastTitle',
  { defaultMessage: 'Failed to restore knowledge indicators' }
);

const DELETE_MODAL_TITLE = (count: number) =>
  i18n.translate('xpack.streams.discoveryKnowledgeIndicators.deleteModalTitle', {
    defaultMessage:
      'Are you sure you want to delete {count, plural, one {this knowledge indicator} other {these knowledge indicators}}?',
    values: { count },
  });
