/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DragDropContextProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiButton,
  EuiButtonEmpty,
  EuiToolTip,
  euiDragDropReorder,
  EuiSpacer,
  useEuiTheme,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import React, { useCallback, useEffect } from 'react';
import { MAX_NESTING_LEVEL, getSegments } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import type { DraggableProvided } from '@hello-pangea/dnd';
import { useScrollToActive } from './use_scroll_to_active';
import { NestedView } from '../../../nested_view';
import { CurrentStreamEntry } from './current_stream_entry';
import { NewRoutingStreamEntry } from './new_routing_stream_entry';
import { IdleRoutingStreamEntry } from './idle_routing_stream_entry';
import { EditRoutingStreamEntry } from './edit_routing_stream_entry';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import { ReviewSuggestionsForm } from './review_suggestions_form/review_suggestions_form';
import { GenerateSuggestionButton } from './review_suggestions_form/generate_suggestions_button';
import { AdditionalChargesCallout } from '../shared/additional_charges_callout';
import { NoSuggestionsCallout } from './review_suggestions_form/no_suggestions_callout';
import { useReviewSuggestionsForm } from './review_suggestions_form/use_review_suggestions_form';
import { BulkCreateStreamsConfirmationModal } from './review_suggestions_form/bulk_create_streams_confirmation_modal';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useAIFeatures } from '../../../../hooks/use_ai_features';
import { NoDataEmptyPrompt } from './empty_prompt';
import { SuggestionLoadingPrompt } from '../shared/suggestion_loading_prompt';
import type { RoutingDefinitionWithUIAttributes } from './types';

function getReasonDisabledCreateButton(
  canManageRoutingRules: boolean,
  isAtMaxNestingLevel: boolean
) {
  if (isAtMaxNestingLevel) {
    return maxNestingLevelText;
  }
  if (!canManageRoutingRules) {
    return cannotManageRoutingRulesText;
  }
}

const IdleRoutingStreamEntryWithPermissions = ({
  availableStreams,
  draggableProvided,
  onEditClick,
  routingRule,
  canReorder,
}: {
  availableStreams: string[];
  draggableProvided: DraggableProvided;
  onEditClick: (id: string) => void;
  routingRule: RoutingDefinitionWithUIAttributes;
  canReorder: boolean;
}) => {
  const isEditingEnabled = useStreamsRoutingSelector((snapshot) =>
    snapshot.can({ type: 'routingRule.edit', id: routingRule.id })
  );

  return (
    <IdleRoutingStreamEntry
      availableStreams={availableStreams}
      draggableProvided={draggableProvided}
      isEditingEnabled={isEditingEnabled}
      onEditClick={onEditClick}
      routingRule={routingRule}
      canReorder={canReorder}
    />
  );
};

export function ChildStreamList({ availableStreams = [] }: { availableStreams?: string[] }) {
  const definition = useStreamsRoutingSelector((snapshot) => snapshot.context.definition);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      className={css`
        overflow: auto;
      `}
    >
      <CurrentStreamEntry definition={definition} />
      <IngestModeChildrenList availableStreams={availableStreams} />
    </EuiFlexGroup>
  );
}

function IngestModeChildrenList({ availableStreams }: { availableStreams: string[] }) {
  const { euiTheme } = useEuiTheme();
  const { changeRule, createNewRule, editRule, reorderRules } = useStreamRoutingEvents();
  const aiFeatures = useAIFeatures();
  const { timeState } = useTimefilter();
  const {
    fetchSuggestions,
    isLoadingSuggestions,
    suggestions,
    suggestionReason,
    resetForm,
    previewSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    updateSuggestion,
    selectedSuggestionNames,
    toggleSuggestionSelection,
    isSuggestionSelected,
    bulkAcceptSuggestions,
    selectAllSuggestions,
    clearSuggestionSelection,
  } = useReviewSuggestionsForm();

  const [showBulkAcceptModal, setShowBulkAcceptModal] = React.useState(false);
  const { acknowledgeBulkFork } = useStreamRoutingEvents();
  const isBulkForkComplete = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({ ready: { ingestMode: { bulkForking: 'complete' } } })
  );
  const bulkForkResults = useStreamsRoutingSelector(
    (snapshot) => snapshot.context.bulkFork?.results
  );

  const handleBulkAccept = () => {
    setShowBulkAcceptModal(true);
  };

  const currentRuleId = useStreamsRoutingSelector((snapshot) => snapshot.context.currentRuleId);
  const definition = useStreamsRoutingSelector((snapshot) => snapshot.context.definition);
  const routing = useStreamsRoutingSelector((snapshot) => snapshot.context.routing);
  const canCreateRoutingRules = useStreamsRoutingSelector((snapshot) =>
    snapshot.can({ type: 'routingRule.create' })
  );
  const canReorderRoutingRules = useStreamsRoutingSelector((snapshot) =>
    snapshot.can({ type: 'routingRule.reorder', routing: snapshot.context.routing })
  );
  const canManageRoutingRules = 'privileges' in definition ? definition.privileges.manage : true;
  const isAtMaxNestingLevel = getSegments(definition.stream.name).length >= MAX_NESTING_LEVEL;
  const shouldDisplayCreateButton =
    'privileges' in definition ? definition.privileges.simulate : true;
  const CreateButtonComponent = aiFeatures && aiFeatures.enabled ? EuiButtonEmpty : EuiButton;
  const scrollToSuggestions = useScrollToActive(!!suggestions);
  const isEditingOrReorderingStreams = useStreamsRoutingSelector(
    (snapshot) =>
      snapshot.matches({ ready: { ingestMode: 'editingRule' } }) ||
      snapshot.matches({ ready: { ingestMode: 'reorderingRules' } })
  );

  // This isRefreshing tracks async gap between operation completion and server data arrival
  const isRefreshing = useStreamsRoutingSelector((snapshot) => snapshot.context.isRefreshing);

  const showAdditionalChargesCallout =
    !!aiFeatures?.isManagedAIConnector && !aiFeatures?.hasAcknowledgedAdditionalCharges;

  const hasData = routing.length > 0 || (aiFeatures?.enabled && suggestions);

  const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(routing, source.index, destination.index);
      reorderRules(items);
    }
  };

  const getSuggestionsForStream = useCallback(
    (connectorId: string) => {
      fetchSuggestions({
        streamName: definition.stream.name,
        connectorId,
        start: timeState.start,
        end: timeState.end,
      });
    },
    [fetchSuggestions, definition.stream.name, timeState.start, timeState.end]
  );

  const refineSuggestionsForStream = useCallback(
    (connectorId: string, userPrompt?: string) => {
      fetchSuggestions({
        streamName: definition.stream.name,
        connectorId,
        start: timeState.start,
        end: timeState.end,
        userPrompt,
        existingPartitions: suggestions ?? undefined,
      });
    },
    [fetchSuggestions, definition.stream.name, timeState.start, timeState.end, suggestions]
  );

  const renderCreateButton = () => {
    return (
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          className={css`
            padding: ${euiTheme.size.l};
            padding-bottom: ${euiTheme.size.xxl};
            flex-grow: 1;
            min-height: 80px;
          `}
          wrap
        >
          {aiFeatures?.enabled && !isLoadingSuggestions && !suggestions && (
            <>
              <EuiFlexItem grow={false}>
                <GenerateSuggestionButton
                  size="s"
                  onClick={getSuggestionsForStream}
                  isLoading={isLoadingSuggestions}
                  isDisabled={isEditingOrReorderingStreams}
                  aiFeatures={aiFeatures}
                >
                  {suggestPartitionsText}
                </GenerateSuggestionButton>
              </EuiFlexItem>
            </>
          )}
          {/* Wait for AI features to resolve so the button type doesn't swap and remount under a click. */}
          {aiFeatures?.loading ? (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
          ) : (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="bottom"
                content={getReasonDisabledCreateButton(canManageRoutingRules, isAtMaxNestingLevel)}
              >
                <CreateButtonComponent
                  size="s"
                  data-test-subj="streamsAppStreamDetailRoutingAddRuleButton"
                  onClick={createNewRule}
                  disabled={!canCreateRoutingRules || isAtMaxNestingLevel}
                >
                  {createPartitionText}
                </CreateButtonComponent>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {showAdditionalChargesCallout && (
          <EuiFlexItem grow={false}>
            <AdditionalChargesCallout aiFeatures={aiFeatures} />
          </EuiFlexItem>
        )}
      </EuiFlexItem>
    );
  };

  const handleBulkAcceptSuccess = useCallback(
    (successfulNames: string[]) => {
      bulkAcceptSuggestions(successfulNames);
      setShowBulkAcceptModal(false);
    },
    [bulkAcceptSuggestions]
  );

  useEffect(() => {
    if (isBulkForkComplete && !showBulkAcceptModal && bulkForkResults) {
      const successfulNames = bulkForkResults.filter((r) => r.success).map((r) => r.name);
      bulkAcceptSuggestions(successfulNames);
      acknowledgeBulkFork();
    }
  }, [
    isBulkForkComplete,
    showBulkAcceptModal,
    bulkForkResults,
    bulkAcceptSuggestions,
    acknowledgeBulkFork,
  ]);

  return !hasData && !isLoadingSuggestions && !isRefreshing ? (
    <>
      <NoDataEmptyPrompt
        createNewRule={createNewRule}
        isLoading={!!aiFeatures?.loading}
        isAiEnabled={!!aiFeatures?.enabled}
      >
        {aiFeatures?.enabled && (
          <GenerateSuggestionButton
            size="s"
            onClick={getSuggestionsForStream}
            isLoading={isLoadingSuggestions}
            isDisabled={isEditingOrReorderingStreams}
            aiFeatures={aiFeatures}
          >
            {suggestPartitionsText}
          </GenerateSuggestionButton>
        )}
      </NoDataEmptyPrompt>
      {showAdditionalChargesCallout && (
        <>
          <EuiSpacer size="s" />
          <AdditionalChargesCallout aiFeatures={aiFeatures} />
        </>
      )}
    </>
  ) : (
    <>
      {showBulkAcceptModal && suggestions && (
        <BulkCreateStreamsConfirmationModal
          suggestions={suggestions}
          selectedNames={selectedSuggestionNames}
          onClose={() => setShowBulkAcceptModal(false)}
          onSuccess={handleBulkAcceptSuccess}
        />
      )}
      {/* Scrollable routing rules container */}
      <EuiFlexItem
        grow={false}
        className={css`
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          max-height: calc(100% - 80px);
        `}
      >
        {routing.length > 0 && (
          <EuiDragDropContext onDragEnd={handlerItemDrag}>
            <EuiDroppable droppableId="routing_children_reordering" spacing="none">
              <EuiFlexGroup direction="column" gutterSize="xs">
                {routing.map((routingRule, pos) => (
                  <EuiFlexItem key={routingRule.id} grow={false}>
                    <EuiDraggable
                      index={pos}
                      isDragDisabled={!canReorderRoutingRules}
                      draggableId={routingRule.id}
                      hasInteractiveChildren={true}
                      customDragHandle={true}
                      spacing="none"
                    >
                      {(provided, snapshot) => (
                        <NestedView
                          last={pos === routing.length - 1}
                          first={pos === 0}
                          isBeingDragged={snapshot.isDragging}
                        >
                          {routingRule.isNew ? (
                            <NewRoutingStreamEntry />
                          ) : currentRuleId === routingRule.id ? (
                            <EditRoutingStreamEntry
                              onChange={changeRule}
                              routingRule={routingRule}
                            />
                          ) : (
                            <IdleRoutingStreamEntryWithPermissions
                              availableStreams={availableStreams}
                              draggableProvided={provided}
                              onEditClick={editRule}
                              routingRule={routingRule}
                              canReorder={canReorderRoutingRules}
                            />
                          )}
                        </NestedView>
                      )}
                    </EuiDraggable>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiDroppable>
          </EuiDragDropContext>
        )}

        {aiFeatures?.enabled && shouldDisplayCreateButton && (
          <div ref={scrollToSuggestions}>
            <EuiSpacer size="m" />
            {isLoadingSuggestions && (
              <SuggestionLoadingPrompt
                onCancel={() => {
                  resetForm();
                }}
              />
            )}
            {!isLoadingSuggestions && suggestions ? (
              isEmpty(suggestions) ? (
                <NoSuggestionsCallout
                  aiFeatures={aiFeatures}
                  isLoadingSuggestions={isLoadingSuggestions}
                  onDismiss={resetForm}
                  onRetry={getSuggestionsForStream}
                  isDisabled={isEditingOrReorderingStreams}
                  reason={suggestionReason}
                />
              ) : (
                <ReviewSuggestionsForm
                  acceptSuggestion={acceptSuggestion}
                  aiFeatures={aiFeatures}
                  definition={definition}
                  isLoadingSuggestions={isLoadingSuggestions}
                  onRegenerate={refineSuggestionsForStream}
                  previewSuggestion={previewSuggestion}
                  rejectSuggestion={rejectSuggestion}
                  resetForm={resetForm}
                  suggestions={suggestions}
                  updateSuggestion={updateSuggestion}
                  selectedSuggestionNames={selectedSuggestionNames}
                  toggleSuggestionSelection={toggleSuggestionSelection}
                  isSuggestionSelected={isSuggestionSelected}
                  onBulkAccept={handleBulkAccept}
                  selectAllSuggestions={selectAllSuggestions}
                  clearSuggestionSelection={clearSuggestionSelection}
                />
              )
            ) : null}
          </div>
        )}
      </EuiFlexItem>

      {shouldDisplayCreateButton && renderCreateButton()}
    </>
  );
}

const maxNestingLevelText = i18n.translate(
  'xpack.streams.streamDetailRouting.rules.maxNestingLevel',
  {
    defaultMessage:
      'You have reached the maximum nesting level for streams. Try to flatten your hierarchy.',
  }
);

const cannotManageRoutingRulesText = i18n.translate(
  'xpack.streams.streamDetailRouting.rules.onlySimulate',
  {
    defaultMessage: "You don't have sufficient privileges to create new streams, only simulate.",
  }
);

const suggestPartitionsText = i18n.translate(
  'xpack.streams.streamDetailRouting.childStreamList.suggestPartitions',
  {
    defaultMessage: 'Get partitions suggestions',
  }
);

const createPartitionText = i18n.translate(
  'xpack.streams.streamDetailRouting.childStreamList.createPartition',
  {
    defaultMessage: 'Create partition',
  }
);
