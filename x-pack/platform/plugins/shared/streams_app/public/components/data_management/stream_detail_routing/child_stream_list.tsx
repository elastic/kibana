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
  EuiButtonGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import React, { useMemo } from 'react';
import { MAX_NESTING_LEVEL, getSegments } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { useScrollToActive } from '@kbn/core-chrome-navigation/src/hooks/use_scroll_to_active';
import type { DraggableProvided } from '@hello-pangea/dnd';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { NestedView } from '../../nested_view';
import { CurrentStreamEntry } from './current_stream_entry';
import { NewRoutingStreamEntry } from './new_routing_stream_entry';
import { IdleRoutingStreamEntry } from './idle_routing_stream_entry';
import { EditRoutingStreamEntry } from './edit_routing_stream_entry';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import { IdleQueryStreamEntry, CreatingQueryStreamEntry } from './query_stream_entry';
import { ReviewSuggestionsForm } from './review_suggestions_form/review_suggestions_form';
import { GenerateSuggestionButton } from './review_suggestions_form/generate_suggestions_button';
import { NoSuggestionsCallout } from './review_suggestions_form/no_suggestions_callout';
import { useReviewSuggestionsForm } from './review_suggestions_form/use_review_suggestions_form';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { useAIFeatures } from '../../../hooks/use_ai_features';
import { NoDataEmptyPrompt } from './empty_prompt';
import { SuggestionLoadingPrompt } from '../shared/suggestion_loading_prompt';
import type { RoutingDefinitionWithUIAttributes } from './types';

function getReasonDisabledCreateButton(canManageRoutingRules: boolean, maxNestingLevel: boolean) {
  if (maxNestingLevel) {
    return maxNestingLevelText;
  }
  if (!canManageRoutingRules) {
    return cannotManageRoutingRulesText;
  }
}

type ChildStreamMode = 'ingestMode' | 'queryMode';

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

export function ChildStreamList({ availableStreams }: { availableStreams: string[] }) {
  const { euiTheme } = useEuiTheme();

  const { features } = useStreamsPrivileges();

  const canUseQueryMode = features.queryStreams.enabled;

  const { changeChildStreamsMode } = useStreamRoutingEvents();

  const definition = useStreamsRoutingSelector((snapshot) => snapshot.context.definition);
  const idSelected = useStreamsRoutingSelector((snapshot) => {
    if (!canUseQueryMode) {
      return 'ingestMode';
    }
    return snapshot.matches({ ready: 'ingestMode' }) ? 'ingestMode' : 'queryMode';
  });

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      className={css`
        overflow: auto;
      `}
    >
      <CurrentStreamEntry definition={definition} />

      {canUseQueryMode && (
        <EuiButtonGroup
          className={css`
            display: flex;
            position: relative;
            margin-top: ${euiTheme.size.s};
            &::before {
              content: '';
              margin-top: -${euiTheme.size.s};
              border-left: ${euiTheme.border.thin};
              position: absolute;
              top: 0;
              left: ${euiTheme.size.base};
              height: ${euiTheme.size.s};
            }
          `}
          legend={i18n.translate('xpack.streams.streamDetailRouting.childStreamList.legend', {
            defaultMessage: 'Child streams type selector',
          })}
          options={[
            {
              id: 'ingestMode',
              label: 'Index',
            },
            {
              id: 'queryMode',
              label: 'Query',
            },
          ]}
          idSelected={idSelected}
          onChange={(mode) => changeChildStreamsMode(mode as ChildStreamMode)}
          buttonSize="compressed"
          color="primary"
        />
      )}
      {idSelected === 'ingestMode' && (
        <IngestModeChildrenList availableStreams={availableStreams} />
      )}
      {canUseQueryMode && idSelected === 'queryMode' && <QueryModeChildrenList />}
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
    resetForm,
    previewSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    updateSuggestion,
  } = useReviewSuggestionsForm();

  const currentRuleId = useStreamsRoutingSelector((snapshot) => snapshot.context.currentRuleId);
  const definition = useStreamsRoutingSelector((snapshot) => snapshot.context.definition);
  const routing = useStreamsRoutingSelector((snapshot) => snapshot.context.routing);
  const canCreateRoutingRules = useStreamsRoutingSelector((snapshot) =>
    snapshot.can({ type: 'routingRule.create' })
  );
  const canReorderRoutingRules = useStreamsRoutingSelector((snapshot) =>
    snapshot.can({ type: 'routingRule.reorder', routing: snapshot.context.routing })
  );
  const canManageRoutingRules = definition.privileges.manage;
  const maxNestingLevel = getSegments(definition.stream.name).length >= MAX_NESTING_LEVEL;
  const shouldDisplayCreateButton = definition.privileges.simulate;
  const CreateButtonComponent = aiFeatures && aiFeatures.enabled ? EuiButtonEmpty : EuiButton;
  const scrollToSuggestions = useScrollToActive(!!suggestions);
  const isEditingOrReorderingStreams = useStreamsRoutingSelector(
    (snapshot) =>
      snapshot.matches({ ready: { ingestMode: 'editingRule' } }) ||
      snapshot.matches({ ready: { ingestMode: 'reorderingRules' } })
  );

  // This isRefreshing tracks async gap between operation completion and server data arrival
  const isRefreshing = useStreamsRoutingSelector((snapshot) => snapshot.context.isRefreshing);

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

  return !hasData && !isLoadingSuggestions && !isRefreshing ? (
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
  );
}

function QueryModeChildrenList() {
  const { euiTheme } = useEuiTheme();

  const definition = useStreamsRoutingSelector((snapshot) => snapshot.context.definition);
  const isCreating = useStreamsRoutingSelector((state) =>
    state.matches({ ready: { queryMode: 'creating' } })
  );
  const { createQueryStream } = useStreamRoutingEvents();
  const canManage = definition.privileges.manage;

  // Get child query stream names from the definition
  const childQueryStreamNames = useMemo(() => {
    const queryStreams = definition.stream.query_streams ?? [];
    return queryStreams.map((ref) => ref.name);
  }, [definition.stream.query_streams]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      className={css`
        overflow: auto;
      `}
    >
      {/* Scrollable query streams container */}
      <EuiFlexItem
        grow={false}
        className={css`
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          max-height: calc(100% - 80px);
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="xs">
          {childQueryStreamNames.map((streamName, pos) => (
            <EuiFlexItem key={streamName} grow={false}>
              <NestedView
                last={pos === childQueryStreamNames.length - 1 && !isCreating}
                first={pos === 0}
              >
                <IdleQueryStreamEntry streamName={streamName} />
              </NestedView>
            </EuiFlexItem>
          ))}

          {isCreating && (
            <EuiFlexItem grow={false}>
              <NestedView last first={isEmpty(childQueryStreamNames)}>
                <CreatingQueryStreamEntry parentStreamName={definition.stream.name} />
              </NestedView>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Create button */}
      {!isCreating && (
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
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="bottom"
                content={
                  !canManage
                    ? i18n.translate(
                        'xpack.streams.queryModeChildrenList.cannotCreateQueryStream',
                        {
                          defaultMessage:
                            "You don't have sufficient privileges to create query streams.",
                        }
                      )
                    : undefined
                }
              >
                <EuiButton
                  size="s"
                  data-test-subj="streamsAppQueryModeCreateButton"
                  onClick={createQueryStream}
                  disabled={!canManage}
                >
                  {i18n.translate('xpack.streams.queryModeChildrenList.createQueryStream', {
                    defaultMessage: 'Create query stream',
                  })}
                </EuiButton>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
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
