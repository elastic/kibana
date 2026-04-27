/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { useMutation } from '@kbn/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  HIGH_SEVERITY_THRESHOLD,
  useUnbackedQueriesCount,
} from '../../../../../hooks/sig_events/use_unbacked_queries_count';
import { useQueriesApi, type PromoteResult } from '../../../../../hooks/sig_events/use_queries_api';
import { useInvalidatePromoteRelatedQueries } from '../../../../../hooks/sig_events/use_invalidate_promote_queries';
import { getFormattedError } from '../../../../../util/errors';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useAIFeatures } from '../../../../../hooks/use_ai_features';
import { AssetImage } from '../../../../asset_image';
import { LoadingPanel } from '../../../../loading_panel';
import { KnowledgeIndicatorDetailsFlyout } from '../../../stream_detail_significant_events_view/knowledge_indicator_details_flyout';
import { DeleteTableItemsModal } from '../../../stream_detail_significant_events_view/delete_table_items_modal';
import { getKnowledgeIndicatorItemId } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_item_id';
import { GenerateSplitButton } from '../shared/generate_split_button';
import { StreamPicker } from '../shared/stream_picker';
import { useKiGeneration } from './ki_generation_context';
import { useKnowledgeIndicatorsTable } from './use_knowledge_indicators_table';
import { useKnowledgeIndicatorsColumns } from './use_knowledge_indicators_columns';
import { KnowledgeIndicatorsToolbar } from './knowledge_indicators_toolbar';
import {
  TABLE_CAPTION,
  NO_ITEMS_MESSAGE,
  EMPTY_STATE_TITLE,
  EMPTY_STATE_DESCRIPTION,
  DELETE_MODAL_TITLE,
  HIDDEN_COMPUTED_FEATURES_HINT,
  GENERATION_IN_PROGRESS_TITLE,
  getGenerationInProgressDescription,
  CREATE_RULES_BUTTON,
  getRuleCountLabel,
  PROMOTE_ALL_ERROR_TOAST_TITLE,
} from './translations';
import { getPromoteAllSuccessToast } from '../queries_table/translations';

export function KnowledgeIndicatorsTable() {
  const { euiTheme } = useEuiTheme();
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const { count: unbackedCount } = useUnbackedQueriesCount();
  const { promoteAll } = useQueriesApi();
  const invalidatePromoteRelatedQueries = useInvalidatePromoteRelatedQueries();

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
      await invalidatePromoteRelatedQueries();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), {
        title: PROMOTE_ALL_ERROR_TOAST_TITLE,
      });
    },
  });

  const [generationStreamNames, setGenerationStreamNames] = useState<string[]>([]);

  const {
    filteredStreams,
    isStreamsLoading,
    generatingStreamNames,
    isGenerating,
    isInitialGenerationStatusLoading,
    isScheduling,
    onboardingConfig,
    setOnboardingConfig,
    featuresConnectors,
    queriesConnectors,
    bulkOnboardAll,
    bulkOnboardFeaturesOnly,
    bulkOnboardQueriesOnly,
  } = useKiGeneration();

  const aiFeatures = useAIFeatures();
  const allConnectors = aiFeatures?.genAiConnectors?.connectors ?? [];
  const connectorError = aiFeatures?.genAiConnectors?.error;
  const isConnectorCatalogUnavailable =
    !allConnectors.length || !!aiFeatures?.genAiConnectors?.loading || !!connectorError;

  const runAndClearPicker = useCallback(
    async (action: (names: string[]) => Promise<string[]>) => {
      const names = generationStreamNames;
      setGenerationStreamNames([]);
      await action(names);
    },
    [generationStreamNames]
  );

  const onRunGeneration = useCallback(
    async () => runAndClearPicker(bulkOnboardAll),
    [runAndClearPicker, bulkOnboardAll]
  );
  const onRunFeaturesOnly = useCallback(
    async () => runAndClearPicker(bulkOnboardFeaturesOnly),
    [runAndClearPicker, bulkOnboardFeaturesOnly]
  );
  const onRunQueriesOnly = useCallback(
    async () => runAndClearPicker(bulkOnboardQueriesOnly),
    [runAndClearPicker, bulkOnboardQueriesOnly]
  );

  const isRunDisabled =
    generationStreamNames.length === 0 ||
    isConnectorCatalogUnavailable ||
    featuresConnectors.loading ||
    queriesConnectors.loading ||
    isScheduling;

  const {
    knowledgeIndicators,
    occurrencesByQueryId,
    isLoading,
    isEmpty,
    refetch,
    filteredKnowledgeIndicators,
    selectedKnowledgeIndicator,
    selectedKnowledgeIndicatorId,
    selectedKnowledgeIndicators,
    setSelectedKnowledgeIndicators,
    knowledgeIndicatorsToDelete,
    setKnowledgeIndicatorsToDelete,
    pagination,
    isDeleting,
    isBulkOperationInProgress,
    isBulkPromoteInProgress,
    isOperationInProgress,
    selectionContainsNonExcludable,
    hasPromotableSelected,
    isSelectionActionsDisabled,
    hasOnlyHiddenComputedFeatures,
    tableSearchValue,
    debouncedSearchTerm,
    statusFilter,
    selectedTypes,
    selectedStreams,
    hideComputedTypes,
    handleStatusFilterChange,
    handleSelectedTypesChange,
    handleSelectedStreamsChange,
    handleComputedToggleChange,
    handleSearchChange,
    handleTableChange,
    handleBulkExclude,
    handleBulkRestore,
    closeFlyout,
    toggleSelectedKnowledgeIndicator,
    deleteKnowledgeIndicatorsInBulk,
    handleBulkPromote,
  } = useKnowledgeIndicatorsTable();

  const wasGeneratingRef = useRef(false);
  useEffect(() => {
    if (isGenerating) {
      wasGeneratingRef.current = true;
      const id = setInterval(() => refetch(), 10_000);
      return () => clearInterval(id);
    }
    if (wasGeneratingRef.current) {
      wasGeneratingRef.current = false;
      refetch();
    }
  }, [isGenerating, refetch]);

  const columns = useKnowledgeIndicatorsColumns({
    occurrencesByQueryId,
    selectedKnowledgeIndicatorId,
    toggleSelectedKnowledgeIndicator,
    setKnowledgeIndicatorsToDelete,
  });

  const generationRow = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <StreamPicker
          streams={filteredStreams}
          isStreamsLoading={isStreamsLoading}
          selectedStreamNames={generationStreamNames}
          onSelectedStreamNamesChange={setGenerationStreamNames}
          excludedStreamNames={generatingStreamNames}
          isDisabled={isScheduling}
          fullWidth
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <GenerateSplitButton
          config={onboardingConfig}
          allConnectors={allConnectors}
          connectorError={connectorError}
          featuresResolvedConnectorId={featuresConnectors.resolvedConnectorId}
          queriesResolvedConnectorId={queriesConnectors.resolvedConnectorId}
          onConfigChange={setOnboardingConfig}
          onRun={onRunGeneration}
          onRunFeaturesOnly={onRunFeaturesOnly}
          onRunQueriesOnly={onRunQueriesOnly}
          isRunDisabled={isRunDisabled}
          isConfigDisabled={generationStreamNames.length === 0}
          isLoading={isScheduling}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const generationProgressCallout = isGenerating ? (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        size="s"
        color="primary"
        iconType={EuiLoadingSpinner}
        title={GENERATION_IN_PROGRESS_TITLE}
        announceOnMount
      >
        <p>{getGenerationInProgressDescription(generatingStreamNames)}</p>
      </EuiCallOut>
    </>
  ) : null;

  if (knowledgeIndicators.length === 0 && (isLoading || isInitialGenerationStatusLoading)) {
    return <LoadingPanel size="l" />;
  }

  if (isEmpty && !isGenerating) {
    return (
      <EuiEmptyPrompt
        aria-live="polite"
        titleSize="xs"
        icon={<AssetImage type="knowledgeIndicatorsEmptyState" />}
        title={<h2>{EMPTY_STATE_TITLE}</h2>}
        body={<p>{EMPTY_STATE_DESCRIPTION}</p>}
        actions={generationRow}
      />
    );
  }

  return (
    <>
      {unbackedCount > 0 && (
        <EuiCallOut
          color="primary"
          size="s"
          announceOnMount={false}
          data-test-subj="kiPromoteAllCallout"
        >
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <AssetImage type="significantEventsEmptyState" size={62} />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.streams.knowledgeIndicators.promoteAllCalloutMessage"
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
                data-test-subj="kiPromoteAllButton"
              >
                {CREATE_RULES_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      )}
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={false} hasShadow>
        {generationRow}
        {generationProgressCallout}
        <EuiSpacer size="m" />
        <KnowledgeIndicatorsToolbar
          knowledgeIndicators={knowledgeIndicators}
          filteredCount={filteredKnowledgeIndicators.length}
          tableSearchValue={tableSearchValue}
          debouncedSearchTerm={debouncedSearchTerm}
          statusFilter={statusFilter}
          selectedTypes={selectedTypes}
          selectedStreams={selectedStreams}
          hideComputedTypes={hideComputedTypes}
          pagination={pagination}
          selectedKnowledgeIndicators={selectedKnowledgeIndicators}
          isBulkOperationInProgress={isBulkOperationInProgress}
          isBulkPromoteInProgress={isBulkPromoteInProgress}
          isDeleting={isDeleting}
          isSelectionActionsDisabled={isSelectionActionsDisabled}
          selectionContainsNonExcludable={selectionContainsNonExcludable}
          hasPromotableSelected={hasPromotableSelected}
          onSearchChange={handleSearchChange}
          onStatusFilterChange={handleStatusFilterChange}
          onSelectedTypesChange={handleSelectedTypesChange}
          onSelectedStreamsChange={handleSelectedStreamsChange}
          onComputedToggleChange={handleComputedToggleChange}
          onClearSelection={() => setSelectedKnowledgeIndicators([])}
          onBulkExclude={handleBulkExclude}
          onBulkRestore={handleBulkRestore}
          onBulkPromote={handleBulkPromote}
          onDeleteSelected={() => setKnowledgeIndicatorsToDelete(selectedKnowledgeIndicators)}
        />
        <EuiSpacer size="s" />
        <EuiHorizontalRule
          margin="none"
          css={css`
            height: ${euiTheme.border.width.thick};
          `}
        />
        {hasOnlyHiddenComputedFeatures && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              size="s"
              color="primary"
              title={HIDDEN_COMPUTED_FEATURES_HINT}
              announceOnMount={false}
            />
          </>
        )}
        <EuiPanel
          color="transparent"
          hasShadow={false}
          hasBorder={false}
          paddingSize="none"
          css={css`
            overflow-x: auto;
            min-width: 0;
            ${isOperationInProgress
              ? `
                pointer-events: none;
                opacity: 0.6;
              `
              : ''}
          `}
        >
          <EuiInMemoryTable<KnowledgeIndicator>
            css={css`
              min-width: 700px;
            `}
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
    </>
  );
}
