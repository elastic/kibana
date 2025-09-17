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
  EuiText,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiButton,
  EuiToolTip,
  EuiCallOut,
  euiDragDropReorder,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import React from 'react';
import { MAX_NESTING_LEVEL, getSegments } from '@kbn/streams-schema';
import { NestedView } from '../../nested_view';
import { CurrentStreamEntry } from './current_stream_entry';
import { NewRoutingStreamEntry } from './new_routing_stream_entry';
import { RoutingStreamEntry } from './routing_stream_entry';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
  useStreamsRoutingActorRef,
} from './state_management/stream_routing_state_machine';
import {
  useReviewSuggestionsForm,
  FormProvider,
} from './review_suggestions_form/use_review_suggestions_form';
import {
  GenerateSuggestionButton,
  useAIFeatures,
} from './review_suggestions_form/generate_suggestions_button';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { SuggestedStreamPanel } from './review_suggestions_form/suggested_stream_panel';

function getReasonDisabledCreateButton(canManageRoutingRules: boolean, maxNestingLevel: boolean) {
  if (maxNestingLevel) {
    return i18n.translate('xpack.streams.streamDetailRouting.rules.maxNestingLevel', {
      defaultMessage:
        'You have reached the maximum nesting level for streams. Try to flatten your hierarchy.',
    });
  }
  if (!canManageRoutingRules) {
    return i18n.translate('xpack.streams.streamDetailRouting.rules.onlySimulate', {
      defaultMessage: "You don't have sufficient privileges to create new streams, only simulate.",
    });
  }
}

export function ChildStreamList({ availableStreams }: { availableStreams: string[] }) {
  const { changeRule, createNewRule, editRule, reorderRules } = useStreamRoutingEvents();
  const streamsRoutingActorRef = useStreamsRoutingActorRef();
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const aiFeatures = useAIFeatures();
  const { timeState } = useTimefilter();

  const { currentRuleId, definition, routing } = routingSnapshot.context;
  const canCreateRoutingRules = routingSnapshot.can({ type: 'routingRule.create' });
  const canReorderRoutingRules = routingSnapshot.can({ type: 'routingRule.reorder', routing });
  const canManageRoutingRules = definition.privileges.manage;
  const maxNestingLevel = getSegments(definition.stream.name).length >= MAX_NESTING_LEVEL;
  const shouldDisplayCreateButton = definition.privileges.simulate;

  const {
    reviewSuggestionsForm,
    isEmpty: isEmptyPartitions,
    reset: resetForm,
    partitions,
    removePartition,
    isLoadingSuggestedPartitions,
    fetchSuggestedPartitions,
  } = useReviewSuggestionsForm();

  const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(routing, source.index, destination.index);
      reorderRules(items);
    }
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      className={css`
        overflow: auto;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" wrap gutterSize="s">
          <EuiText
            size="s"
            className={css`
              height: 40px;
              align-content: center;
              font-weight: bold;
            `}
          >
            {i18n.translate('xpack.streams.streamDetailRouting.rules.header', {
              defaultMessage: 'Routing rules',
            })}
          </EuiText>
          {shouldDisplayCreateButton && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={getReasonDisabledCreateButton(canManageRoutingRules, maxNestingLevel)}
              >
                <EuiButton
                  iconType="plus"
                  size="s"
                  data-test-subj="streamsAppStreamDetailRoutingAddRuleButton"
                  onClick={createNewRule}
                  disabled={!canCreateRoutingRules || maxNestingLevel}
                >
                  {i18n.translate('xpack.streams.streamDetailRouting.addRule', {
                    defaultMessage: 'Create child stream',
                  })}
                </EuiButton>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        className={css`
          overflow: auto;
        `}
      >
        <CurrentStreamEntry definition={definition} />
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
                        isBeingDragged={snapshot.isDragging}
                      >
                        {routingRule.isNew ? (
                          <NewRoutingStreamEntry />
                        ) : (
                          <RoutingStreamEntry
                            availableStreams={availableStreams}
                            draggableProvided={provided}
                            isEditing={currentRuleId === routingRule.id}
                            isEditingEnabled={routingSnapshot.can({
                              type: 'routingRule.edit',
                              id: routingRule.id,
                            })}
                            onChange={changeRule}
                            onEditIconClick={editRule}
                            routingRule={routingRule}
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
        <EuiSpacer size="m" />

        {aiFeatures && shouldDisplayCreateButton && (
          <>
            {isEmptyPartitions ? (
              <EuiCallOut
                title={i18n.translate(
                  'xpack.streams.streamDetailRouting.childStreamList.noSuggestionsTitle',
                  {
                    defaultMessage: 'No suggestions available',
                  }
                )}
                onDismiss={resetForm}
              >
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.streams.streamDetailRouting.childStreamList.noSuggestionsDescription',
                    {
                      defaultMessage: 'Retry using a different time range or stream.',
                    }
                  )}
                </EuiText>
              </EuiCallOut>
            ) : partitions.length === 0 ? (
                <EuiFlexGroup justifyContent="center" alignItems="flexStart">
                  <EuiFlexItem grow={false}>
                    <GenerateSuggestionButton
                      size="s"
                      onClick={(connectorId) =>
                        fetchSuggestedPartitions({
                          streamName: definition.stream.name,
                          connectorId,
                          start: timeState.start,
                          end: timeState.end,
                        })
                      }
                      isLoading={isLoadingSuggestedPartitions}
                      aiFeatures={aiFeatures}
                    >
                      {i18n.translate(
                        'xpack.streams.streamDetailRouting.childStreamList.suggestPartitions',
                        {
                          defaultMessage: 'Suggest partitions with AI',
                        }
                      )}
                    </GenerateSuggestionButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
            ) : (
              <FormProvider {...reviewSuggestionsForm}>
                <EuiCallOut
                  title="Review partitioning suggestions"
                  onDismiss={resetForm}
                  className={css`
                    min-block-size: auto; /* Prevent background clipping */
                  `}
                >
                  <EuiText size="s">
                    {i18n.translate(
                      'xpack.streams.streamDetailRouting.childStreamList.suggestPartitionsDescription',
                      {
                        defaultMessage:
                          'Preview each suggestion before accepting - They will change how your data is ingested. All suggestions are based on the same sample: each proposal uses 1,000 documents from the original stream.',
                      }
                    )}
                  </EuiText>
                  <EuiSpacer size="m" />
                  {partitions.map((partition, index) => (
                    <NestedView key={partition.id} last={index === partitions.length - 1}>
                      <SuggestedStreamPanel
                        partition={partition}
                        parentName={definition.stream.name}
                        onDismiss={() => removePartition(index)}
                        onPreview={() =>
                          streamsRoutingActorRef.send({
                            type: 'suggestion.preview',
                            condition: partition.condition,
                          })
                        }
                      />
                      <EuiSpacer size="s" />
                    </NestedView>
                  ))}
                  <EuiSpacer size="m" />
                  <GenerateSuggestionButton
                    iconType="refresh"
                    size="s"
                    onClick={(connectorId) =>
                      fetchSuggestedPartitions({
                        streamName: definition.stream.name,
                        connectorId,
                        start: timeState.start,
                        end: timeState.end,
                      })
                    }
                    isLoading={isLoadingSuggestedPartitions}
                    aiFeatures={aiFeatures}
                  >
                    {i18n.translate(
                      'xpack.streams.streamDetailRouting.childStreamList.regenerateSuggestedPartitions',
                      {
                        defaultMessage: 'Regenerate',
                      }
                    )}
                  </GenerateSuggestionButton>
                </EuiCallOut>
              </FormProvider>
            )}
          </>
        )}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
