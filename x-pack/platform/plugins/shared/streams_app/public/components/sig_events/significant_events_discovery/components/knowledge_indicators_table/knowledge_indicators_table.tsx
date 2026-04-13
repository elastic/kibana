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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useIsMutating } from '@kbn/react-query';
import { COMPUTED_FEATURE_TYPES, isComputedFeature } from '@kbn/streams-schema';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import React, { useState, useCallback, useMemo } from 'react';
import { useFetchKnowledgeIndicators } from '../../../../../hooks/sig_events/use_fetch_knowledge_indicators';
import { useDiscoveryFeaturesApi } from '../../../../../hooks/sig_events/use_discovery_features_api';
import { useKnowledgeIndicatorsBulkDelete } from '../../../../../hooks/sig_events/use_knowledge_indicators_bulk_delete';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../../../../hooks/use_streams_app_router';
import { AssetImage } from '../../../../asset_image';
import { LoadingPanel } from '../../../../loading_panel';
import { SparkPlot } from '../../../../spark_plot';
import { TableTitle } from '../../../stream_detail_systems/table_title';
import { getConfidenceColor } from '../../../stream_detail_significant_events_view/utils/get_confidence_color';
import {
  KnowledgeIndicatorActionsCell,
  KI_ROW_ACTION_MUTATION_KEY,
} from '../../../stream_detail_significant_events_view/knowledge_indicator_actions_cell';
import { KnowledgeIndicatorDetailsFlyout } from '../../../stream_detail_significant_events_view/knowledge_indicator_details_flyout';
import { DeleteTableItemsModal } from '../../../stream_detail_significant_events_view/delete_table_items_modal';
import { KnowledgeIndicatorsTypeFilter } from '../../../stream_detail_significant_events_view/knowledge_indicators_type_filter';
import { KnowledgeIndicatorsStatusFilter } from '../../../stream_detail_significant_events_view/knowledge_indicators_status_filter';
import { getKnowledgeIndicatorItemId } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_item_id';
import { getKnowledgeIndicatorStreamName } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_stream_name';
import {
  BACKED_STATUS_COLUMN,
  PROMOTED_BADGE_LABEL,
  NOT_PROMOTED_BADGE_LABEL,
  PROMOTED_TOOLTIP_CONTENT,
  NOT_PROMOTED_TOOLTIP_CONTENT,
} from '../queries_table/translations';
import { StreamFilter } from '../stream_filter';
import {
  getKnowledgeIndicatorTitle,
  useKnowledgeIndicatorsStateSync,
} from './use_knowledge_indicators_state_sync';
import {
  TITLE_COLUMN_LABEL,
  EVENTS_COLUMN_LABEL,
  TYPE_COLUMN_LABEL,
  QUERY_TYPE_LABEL,
  CONFIDENCE_COLUMN_LABEL,
  STREAM_COLUMN_LABEL,
  ACTIONS_COLUMN_LABEL,
  VIEW_DETAILS_ARIA_LABEL,
  MINIMIZE_DETAILS_ARIA_LABEL,
  OCCURRENCES_TOOLTIP_NAME,
  TABLE_CAPTION,
  TABLE_LABEL,
  NO_ITEMS_MESSAGE,
  SEARCH_PLACEHOLDER,
  SEARCH_ARIA_LABEL,
  SHOW_COMPUTED_LABEL,
  CLEAR_SELECTION_LABEL,
  DELETE_SELECTED_LABEL,
  EXCLUDE_SELECTED_LABEL,
  RESTORE_SELECTED_LABEL,
  EMPTY_STATE_TITLE,
  EMPTY_STATE_DESCRIPTION,
  EMPTY_STATE_GO_TO_STREAMS,
  CANNOT_EXCLUDE_SELECTION_TOOLTIP,
  BULK_EXCLUDE_SUCCESS_TOAST_TITLE,
  BULK_EXCLUDE_PARTIAL_TOAST_TITLE,
  BULK_EXCLUDE_ERROR_TOAST_TITLE,
  BULK_RESTORE_SUCCESS_TOAST_TITLE,
  BULK_RESTORE_PARTIAL_TOAST_TITLE,
  BULK_RESTORE_ERROR_TOAST_TITLE,
  DELETE_MODAL_TITLE,
} from './translations';

const SEARCH_DEBOUNCE_MS = 300;
const COMPUTED_FEATURE_TYPES_SET = new Set<string>(COMPUTED_FEATURE_TYPES);
const EMPTY_ANNOTATIONS: never[] = [];
const capitalizeStyle = css`
  text-transform: capitalize;
`;

export function KnowledgeIndicatorsTable() {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();

  const { knowledgeIndicators, occurrencesByQueryId, isLoading, isEmpty, refetch } =
    useFetchKnowledgeIndicators();
  const { excludeFeaturesInBulk, restoreFeaturesInBulk } = useDiscoveryFeaturesApi();

  const [tableSearchValue, setTableSearchValue] = useState('');
  const debouncedSearchTerm = useDebouncedValue(tableSearchValue, SEARCH_DEBOUNCE_MS)
    .trim()
    .toLowerCase();
  const [statusFilter, setStatusFilter] = useState<'active' | 'excluded'>('active');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [hideComputedTypes, setHideComputedTypes] = useState(true);

  const [selectedKnowledgeIndicator, setSelectedKnowledgeIndicator] =
    useState<KnowledgeIndicator | null>(null);
  const [selectedKnowledgeIndicators, setSelectedKnowledgeIndicators] = useState<
    KnowledgeIndicator[]
  >([]);
  const [knowledgeIndicatorsToDelete, setKnowledgeIndicatorsToDelete] = useState<
    KnowledgeIndicator[]
  >([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const { deleteKnowledgeIndicatorsInBulk, isDeleting } = useKnowledgeIndicatorsBulkDelete({
    onSuccess: () => {
      setSelectedKnowledgeIndicators([]);
      setKnowledgeIndicatorsToDelete([]);
      closeFlyout();
    },
  });

  const [isBulkOperationInProgress, setIsBulkOperationInProgress] = useState(false);
  const isRowActionInProgress = useIsMutating({ mutationKey: KI_ROW_ACTION_MUTATION_KEY }) > 0;

  const selectedKnowledgeIndicatorId = selectedKnowledgeIndicator
    ? getKnowledgeIndicatorItemId(selectedKnowledgeIndicator)
    : undefined;

  const filteredKnowledgeIndicators = useKnowledgeIndicatorsStateSync({
    knowledgeIndicators,
    statusFilter,
    selectedTypes,
    selectedStreams,
    hideComputedTypes,
    debouncedSearchTerm,
    setSelectedKnowledgeIndicator,
    setSelectedKnowledgeIndicators,
    setSelectedTypes,
    setSelectedStreams,
  });

  const resetPagination = useCallback(() => {
    setPagination((current) => {
      if (current.pageIndex === 0) return current;
      return { ...current, pageIndex: 0 };
    });
  }, []);

  const handleStatusFilterChange = useCallback(
    (filter: 'active' | 'excluded') => {
      setStatusFilter(filter);
      setSelectedKnowledgeIndicators([]);
      resetPagination();
    },
    [resetPagination]
  );

  const handleSelectedTypesChange = useCallback(
    (types: string[]) => {
      setSelectedTypes(types);
      resetPagination();
    },
    [resetPagination]
  );

  const handleSelectedStreamsChange = useCallback(
    (streams: string[]) => {
      setSelectedStreams(streams);
      resetPagination();
    },
    [resetPagination]
  );

  const handleComputedToggleChange = useCallback(
    (checked: boolean) => {
      const shouldHide = !checked;
      setHideComputedTypes(shouldHide);
      if (shouldHide) {
        setSelectedTypes((current) =>
          current.filter((type) => !COMPUTED_FEATURE_TYPES_SET.has(type))
        );
      }
      resetPagination();
    },
    [resetPagination]
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setTableSearchValue(event.target.value);
      resetPagination();
    },
    [resetPagination]
  );

  const closeFlyout = useCallback(() => {
    setSelectedKnowledgeIndicator(null);
  }, []);

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
    async ({
      operation,
      successTitle,
      partialTitle,
      errorTitle,
    }: {
      operation: typeof excludeFeaturesInBulk;
      successTitle: string;
      partialTitle: string;
      errorTitle: string;
    }) => {
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
        closeFlyout();
      } catch (error) {
        toasts.addError(error instanceof Error ? error : new Error(String(error)), {
          title: errorTitle,
        });
      } finally {
        setIsBulkOperationInProgress(false);
        refetch();
      }
    },
    [closeFlyout, selectedKnowledgeIndicators, toasts, refetch]
  );

  const handleBulkExclude = useCallback(
    () =>
      executeBulkFeatureOperation({
        operation: excludeFeaturesInBulk,
        successTitle: BULK_EXCLUDE_SUCCESS_TOAST_TITLE,
        partialTitle: BULK_EXCLUDE_PARTIAL_TOAST_TITLE,
        errorTitle: BULK_EXCLUDE_ERROR_TOAST_TITLE,
      }),
    [executeBulkFeatureOperation, excludeFeaturesInBulk]
  );

  const handleBulkRestore = useCallback(
    () =>
      executeBulkFeatureOperation({
        operation: restoreFeaturesInBulk,
        successTitle: BULK_RESTORE_SUCCESS_TOAST_TITLE,
        partialTitle: BULK_RESTORE_PARTIAL_TOAST_TITLE,
        errorTitle: BULK_RESTORE_ERROR_TOAST_TITLE,
      }),
    [executeBulkFeatureOperation, restoreFeaturesInBulk]
  );

  const isOperationInProgress = isDeleting || isBulkOperationInProgress || isRowActionInProgress;

  const { selectionContainsNonExcludable, isSelectionActionsDisabled } = useMemo(() => {
    const containsQueries = selectedKnowledgeIndicators.some((ki) => ki.kind === 'query');
    const containsComputed = selectedKnowledgeIndicators.some(
      (ki) => ki.kind === 'feature' && isComputedFeature(ki.feature)
    );
    return {
      selectionContainsNonExcludable: containsQueries || containsComputed,
      isSelectionActionsDisabled: selectedKnowledgeIndicators.length === 0 || isOperationInProgress,
    };
  }, [selectedKnowledgeIndicators, isOperationInProgress]);

  const columns = useMemo<Array<EuiBasicTableColumn<KnowledgeIndicator>>>(
    () => [
      {
        name: TITLE_COLUMN_LABEL,
        render: (ki: KnowledgeIndicator) => {
          const title = getKnowledgeIndicatorTitle(ki);
          const isExpanded = selectedKnowledgeIndicatorId === getKnowledgeIndicatorItemId(ki);

          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  data-test-subj="knowledgeIndicatorsDetailsButton"
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
        width: '110px',
        render: (ki: KnowledgeIndicator) => {
          if (ki.kind !== 'query' || !ki.rule.backed) {
            return null;
          }

          const occurrences = occurrencesByQueryId[ki.query.id];
          if (!occurrences) return null;

          return (
            <SparkPlot
              id={`ki-events-${ki.query.id}`}
              name={OCCURRENCES_TOOLTIP_NAME}
              type="bar"
              timeseries={occurrences}
              annotations={EMPTY_ANNOTATIONS}
              compressed
              hideAxis
              height={32}
            />
          );
        },
      },
      {
        name: TYPE_COLUMN_LABEL,
        width: '90px',
        render: (ki: KnowledgeIndicator) => {
          if (ki.kind === 'feature') {
            return (
              <EuiBadge color="hollow" css={capitalizeStyle}>
                {ki.feature.type}
              </EuiBadge>
            );
          }
          return <EuiBadge color="hollow">{QUERY_TYPE_LABEL}</EuiBadge>;
        },
      },
      {
        name: CONFIDENCE_COLUMN_LABEL,
        width: '70px',
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
        width: '110px',
        render: (ki: KnowledgeIndicator) => {
          return <EuiBadge color="hollow">{getKnowledgeIndicatorStreamName(ki)}</EuiBadge>;
        },
      },
      {
        name: BACKED_STATUS_COLUMN,
        width: '100px',
        render: (ki: KnowledgeIndicator) => {
          if (ki.kind !== 'query') return null;
          return (
            <EuiToolTip
              content={ki.rule.backed ? PROMOTED_TOOLTIP_CONTENT : NOT_PROMOTED_TOOLTIP_CONTENT}
            >
              <span tabIndex={0}>
                <EuiBadge color={ki.rule.backed ? 'hollow' : 'warning'}>
                  {ki.rule.backed ? PROMOTED_BADGE_LABEL : NOT_PROMOTED_BADGE_LABEL}
                </EuiBadge>
              </span>
            </EuiToolTip>
          );
        },
      },
      {
        name: ACTIONS_COLUMN_LABEL,
        width: '60px',
        align: 'right',
        render: (ki: KnowledgeIndicator) => (
          <KnowledgeIndicatorActionsCell
            streamName={getKnowledgeIndicatorStreamName(ki)}
            knowledgeIndicator={ki}
            onDeleteRequest={(item) => setKnowledgeIndicatorsToDelete([item])}
          />
        ),
      },
    ],
    [occurrencesByQueryId, selectedKnowledgeIndicatorId, toggleSelectedKnowledgeIndicator]
  );

  if (isLoading) {
    return <LoadingPanel size="l" />;
  }

  if (isEmpty) {
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
            onChange={handleSearchChange}
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
            hideComputedTypes={hideComputedTypes}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <KnowledgeIndicatorsTypeFilter
            knowledgeIndicators={knowledgeIndicators}
            searchTerm={debouncedSearchTerm}
            statusFilter={statusFilter}
            selectedTypes={selectedTypes}
            onSelectedTypesChange={handleSelectedTypesChange}
            hideComputedTypes={hideComputedTypes}
            selectedStreams={selectedStreams}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StreamFilter
            knowledgeIndicators={knowledgeIndicators}
            searchTerm={debouncedSearchTerm}
            statusFilter={statusFilter}
            selectedTypes={selectedTypes}
            hideComputedTypes={hideComputedTypes}
            selectedStreams={selectedStreams}
            onSelectedStreamsChange={handleSelectedStreamsChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={SHOW_COMPUTED_LABEL}
            checked={!hideComputedTypes}
            onChange={(e) => handleComputedToggleChange(e.target.checked)}
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
            <BulkExcludeButton
              isLoading={isBulkOperationInProgress}
              isDisabled={isSelectionActionsDisabled || selectionContainsNonExcludable}
              showTooltip={selectionContainsNonExcludable}
              onClick={handleBulkExclude}
            />
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
      <EuiHorizontalRule
        margin="none"
        css={css`
          height: ${euiTheme.border.width.thick};
        `}
      />
      <EuiPanel
        color="transparent"
        hasShadow={false}
        hasBorder={false}
        paddingSize="none"
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
      </EuiPanel>
      {selectedKnowledgeIndicator ? (
        <KnowledgeIndicatorDetailsFlyout
          knowledgeIndicator={selectedKnowledgeIndicator}
          occurrencesByQueryId={occurrencesByQueryId}
          onClose={closeFlyout}
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

function BulkExcludeButton({
  isLoading: loading,
  isDisabled,
  showTooltip,
  onClick,
}: {
  isLoading: boolean;
  isDisabled: boolean;
  showTooltip: boolean;
  onClick: () => void;
}) {
  const button = (
    <EuiButtonEmpty
      iconType="eyeClosed"
      color="warning"
      size="xs"
      aria-label={EXCLUDE_SELECTED_LABEL}
      isLoading={loading}
      isDisabled={isDisabled}
      hasAriaDisabled={showTooltip}
      onClick={onClick}
    >
      {EXCLUDE_SELECTED_LABEL}
    </EuiButtonEmpty>
  );

  if (showTooltip) {
    return <EuiToolTip content={CANNOT_EXCLUDE_SELECTION_TOOLTIP}>{button}</EuiToolTip>;
  }

  return button;
}
