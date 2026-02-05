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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import React from 'react';
import { MAX_NESTING_LEVEL, getSegments } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { useScrollToActive } from '@kbn/core-chrome-navigation/src/hooks/use_scroll_to_active';
import { NestedView } from '../../nested_view';
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
import { NoSuggestionsCallout } from './review_suggestions_form/no_suggestions_callout';
import { useReviewSuggestionsForm } from './review_suggestions_form/use_review_suggestions_form';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { useAIFeatures } from '../../../hooks/use_ai_features';
import { NoDataEmptyPrompt } from './empty_prompt';
import { SuggestionLoadingPrompt } from '../shared/suggestion_loading_prompt';

function getReasonDisabledCreateButton(canManageRoutingRules: boolean, maxNestingLevel: boolean) {
  if (maxNestingLevel) {
    return maxNestingLevelText;
  }
  if (!canManageRoutingRules) {
    return cannotManageRoutingRulesText;
  }
}

export function ChildStreamList({ availableStreams }: { availableStreams: string[] }) {
  const { euiTheme } = useEuiTheme();
  const { changeRule, createNewRule, editRule, reorderRules } = useStreamRoutingEvents();
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const aiFeatures = useAIFeatures();
  const { timeState } = useTimefilter();
  const {
    fetchSuggestions,
    isLoadingSuggestions,
    suggestions,
    resetForm,
    previewSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    updateSuggestion,
  } = useReviewSuggestionsForm();

  const { currentRuleId, definition, routing } = routingSnapshot.context;
  const canCreateRoutingRules = routingSnapshot.can({ type: 'routingRule.create' });
  const canReorderRoutingRules = routingSnapshot.can({ type: 'routingRule.reorder', routing });
  const canManageRoutingRules = definition.privileges.manage;
  const maxNestingLevel = getSegments(definition.stream.name).length >= MAX_NESTING_LEVEL;
  const shouldDisplayCreateButton = definition.privileges.simulate;
  const CreateButtonComponent = aiFeatures && aiFeatures.enabled ? EuiButtonEmpty : EuiButton;
  const scrollToSuggestions = useScrollToActive(!!suggestions);
  const isEditingOrReorderingStreams =
    routingSnapshot.matches({ ready: 'editingRule' }) ||
    routingSnapshot.matches({ ready: 'reorderingRules' });

  // This isRefreshing tracks async gap between operation completion and server data arrival
  const { isRefreshing } = routingSnapshot.context;

  const hasData = routing.length > 0 || (aiFeatures?.enabled && suggestions);

  const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(routing, source.index, destination.index);
      reorderRules(items);
    }
  };

  const getSuggestionsForStream = (connectorId: string) => {
    fetchSuggestions({
      streamName: definition.stream.name,
      connectorId,
      start: timeState.start,
      end: timeState.end,
    });
  };

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
            <EuiFlexItem grow={false}>
              <GenerateSuggestionButton
                size="s"
                onClick={getSuggestionsForStream}
                isLoading={isLoadingSuggestions}
                isDisabled={isEditingOrReorderingStreams}
                aiFeatures={aiFeatures}
              >
                {suggestPartitionsWithAIText}
              </GenerateSuggestionButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="bottom"
              content={getReasonDisabledCreateButton(canManageRoutingRules, maxNestingLevel)}
            >
              <CreateButtonComponent
                size="s"
                data-test-subj="streamsAppStreamDetailRoutingAddRuleButton"
                onClick={createNewRule}
                disabled={!canCreateRoutingRules || maxNestingLevel}
              >
                {createPartitionManuallyText}
              </CreateButtonComponent>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      className={css`
        overflow: auto;
      `}
    >
      <CurrentStreamEntry definition={definition} />

      {!hasData && !isLoadingSuggestions && !isRefreshing ? (
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
              {suggestPartitionsWithAIText}
            </GenerateSuggestionButton>
          )}
        </NoDataEmptyPrompt>
      ) : (
        <>
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
                                <IdleRoutingStreamEntry
                                  availableStreams={availableStreams}
                                  draggableProvided={provided}
                                  isEditingEnabled={routingSnapshot.can({
                                    type: 'routingRule.edit',
                                    id: routingRule.id,
                                  })}
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
                      onRegenerate={getSuggestionsForStream}
                      isDisabled={isEditingOrReorderingStreams}
                    />
                  ) : (
                    <ReviewSuggestionsForm
                      acceptSuggestion={acceptSuggestion}
                      aiFeatures={aiFeatures}
                      definition={definition}
                      isLoadingSuggestions={isLoadingSuggestions}
                      onRegenerate={getSuggestionsForStream}
                      previewSuggestion={previewSuggestion}
                      rejectSuggestion={rejectSuggestion}
                      resetForm={resetForm}
                      suggestions={suggestions}
                      updateSuggestion={updateSuggestion}
                    />
                  )
                ) : null}
              </div>
            )}
          </EuiFlexItem>

          {shouldDisplayCreateButton && renderCreateButton()}
        </>
      )}
    </EuiFlexGroup>
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

const suggestPartitionsWithAIText = i18n.translate(
  'xpack.streams.streamDetailRouting.childStreamList.suggestPartitions',
  {
    defaultMessage: 'Suggest partitions with AI',
  }
);

const createPartitionManuallyText = i18n.translate('xpack.streams.streamDetailRouting.addRule', {
  defaultMessage: 'Create partition manually',
});
