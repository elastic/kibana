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
  EuiText,
  useEuiTheme,
  EuiButtonGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import React, { useCallback, useEffect, useMemo } from 'react';
import { MAX_NESTING_LEVEL, getSegments, Streams } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { useScrollToActive } from '@kbn/ui-side-navigation/src/hooks/use_scroll_to_active';
import type { DraggableProvided } from '@hello-pangea/dnd';
import { useDiscardConfirm } from '../../../../hooks/use_discard_confirm';
import { useStreamsPrivileges } from '../../../../hooks/use_streams_privileges';
import { useKibana } from '../../../../hooks/use_kibana';
import { NestedView } from '../../../nested_view';
import { CurrentStreamEntry } from './current_stream_entry';
import { NewRoutingStreamEntry } from './new_routing_stream_entry';
import { IdleRoutingStreamEntry } from './idle_routing_stream_entry';
import { EditRoutingStreamEntry } from './edit_routing_stream_entry';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import {
  IdleQueryStreamEntry,
  CreatingQueryStreamEntry,
  EditingQueryStreamEntry,
} from './query_stream_entry';
import { ReviewSuggestionsForm } from './review_suggestions_form/review_suggestions_form';
import { GenerateSuggestionButton } from './review_suggestions_form/generate_suggestions_button';
import { AdditionalChargesCallout } from '../shared/additional_charges_callout';
import { NoSuggestionsCallout } from './review_suggestions_form/no_suggestions_callout';
import { useReviewSuggestionsForm } from './review_suggestions_form/use_review_suggestions_form';
import { BulkCreateStreamsConfirmationModal } from './review_suggestions_form/bulk_create_streams_confirmation_modal';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useAIFeatures } from '../../../../hooks/use_ai_features';
import { NoDataEmptyPrompt } from './empty_prompt';
import { QueryModeEmptyPrompt } from './query_mode_empty_prompt';
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

export function ChildStreamList({ availableStreams = [] }: { availableStreams?: string[] }) {
  const { euiTheme } = useEuiTheme();

  const { features } = useStreamsPrivileges();

  const canUseQueryMode = features.queryStreams.enabled;

  const { changeChildStreamsMode } = useStreamRoutingEvents();

  const definition = useStreamsRoutingSelector((snapshot) => snapshot.context.definition);
  const isWiredStream = Streams.WiredStream.Definition.is(definition.stream);
  const selectedChildStreamMode = useStreamsRoutingSelector((snapshot) => {
    if (!canUseQueryMode) {
      return 'ingestMode';
    }
    return snapshot.matches({ ready: 'ingestMode' }) ? 'ingestMode' : 'queryMode';
  });

  const hasActiveQueryModeForm = useStreamsRoutingSelector(
    (state) =>
      state.matches({ ready: { queryMode: 'editing' } }) ||
      state.matches({ ready: { queryMode: 'creating' } })
  );

  const handleModeChange = useDiscardConfirm(
    (mode: string) => changeChildStreamsMode(mode as ChildStreamMode),
    { enabled: hasActiveQueryModeForm }
  );

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
        <div
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
        >
          <EuiButtonGroup
            legend={i18n.translate('xpack.streams.streamDetailRouting.childStreamList.legend', {
              defaultMessage: 'Child streams type selector',
            })}
            options={
              isWiredStream
                ? [
                    {
                      id: 'ingestMode',
                      label: i18n.translate(
                        'xpack.streams.streamDetailRouting.childStreamList.ingestModeLabel',
                        { defaultMessage: 'Index' }
                      ),
                    },
                    {
                      id: 'queryMode',
                      label: i18n.translate(
                        'xpack.streams.streamDetailRouting.childStreamList.queryModeLabel',
                        { defaultMessage: 'Query' }
                      ),
                    },
                  ]
                : [
                    {
                      id: 'queryMode',
                      label: i18n.translate(
                        'xpack.streams.streamDetailRouting.childStreamList.queryModeLabel',
                        { defaultMessage: 'Query' }
                      ),
                    },
                  ]
            }
            idSelected={selectedChildStreamMode}
            onChange={handleModeChange}
            buttonSize="compressed"
            color="primary"
            data-test-subj="streamsAppChildStreamTypeSelector"
          />
        </div>
      )}
      {isWiredStream && selectedChildStreamMode === 'ingestMode' && (
        <IngestModeChildrenList availableStreams={availableStreams} />
      )}
      {canUseQueryMode && selectedChildStreamMode === 'queryMode' && <QueryModeChildrenList />}
      {canUseQueryMode && !isWiredStream && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" textAlign="center">
            {i18n.translate('xpack.streams.streamDetailRouting.childStreamList.classicNotice', {
              defaultMessage: 'Ingest-time partitioning is not available for this stream type.',
            })}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

// Routing rules are reordered across two droppable zones so the draft-ordering invariant
// (drafts must come after all materialized streams) can be enforced via drag-and-drop without
// flicker. See handleDragStart for why the disabled zone is decided at drag start.
const MATERIALIZED_DROPPABLE_ID = 'routing_children_materialized';
const DRAFT_DROPPABLE_ID = 'routing_children_draft';

function IngestModeChildrenList({ availableStreams }: { availableStreams: string[] }) {
  const { euiTheme } = useEuiTheme();
  const {
    core: { notifications },
  } = useKibana();
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
  // The zone (droppable) the active drag started from. Used to disable the opposite zone for the
  // whole drag so the draft boundary can't be crossed. null when no drag is in progress.
  const [draggingDroppableId, setDraggingDroppableId] = React.useState<string | null>(null);
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

  const newRule = routing.find((rule) => rule.isNew);
  const persistedRules = useMemo(() => routing.filter((rule) => !rule.isNew), [routing]);
  // Split the persisted rules into the two reorder zones. Materialized streams always precede
  // drafts, so a valid full order can always be reconstructed by concatenating the two zones.
  const materializedRules = useMemo(
    () => persistedRules.filter((rule) => !rule.draft),
    [persistedRules]
  );
  const draftRules = useMemo(() => persistedRules.filter((rule) => rule.draft), [persistedRules]);

  // Decide which zone is locked for the whole drag based on where it started, rather than reacting
  // to the live destination. Eeciding at drag start keeps it stable and lets the library play its
  // smooth return-to-origin animation when the drop crosses the draft boundary.
  const handleDragStart: DragDropContextProps['onDragStart'] = (start) => {
    setDraggingDroppableId(start.source.droppableId);
  };

  const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    setDraggingDroppableId(null);

    // No destination means the drop was rejected by the disabled opposite zone (a draft dropped
    // among materialized streams, or vice versa) or released outside the list. The library
    // animates the item back to its origin; warn only when the move crossed the draft boundary.
    if (!destination) {
      const draggedFromDraftZone = source.droppableId === DRAFT_DROPPABLE_ID;
      const wouldCrossBoundary = draggedFromDraftZone
        ? materializedRules.length > 0
        : draftRules.length > 0;
      if (wouldCrossBoundary) {
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.streams.streamDetailRouting.invalidRoutingOrderTitle', {
            defaultMessage: 'Invalid routing order',
          }),
          text: i18n.translate('xpack.streams.streamDetailRouting.invalidRoutingOrderDescription', {
            defaultMessage: 'Draft streams must be placed after all materialized streams.',
          }),
        });
      }
      return;
    }

    // Cross-zone drops are disabled, so a non-null destination is always within the source zone.
    const isDraftZone = source.droppableId === DRAFT_DROPPABLE_ID;
    const zone = isDraftZone ? draftRules : materializedRules;
    const reorderedZone = euiDragDropReorder(zone, source.index, destination.index);
    reorderRules(
      isDraftZone ? [...materializedRules, ...reorderedZone] : [...reorderedZone, ...draftRules]
    );
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

  // Renders a single draggable rule. `indexWithinZone` is the draggable index inside its droppable;
  // `globalIndex` positions it across both zones so the nested tree connectors stay continuous.
  const renderRoutingRule = (
    routingRule: RoutingDefinitionWithUIAttributes,
    indexWithinZone: number,
    globalIndex: number
  ) => (
    <EuiFlexItem key={routingRule.id} grow={false}>
      <EuiDraggable
        index={indexWithinZone}
        isDragDisabled={!canReorderRoutingRules}
        draggableId={routingRule.id}
        hasInteractiveChildren={true}
        customDragHandle={true}
        spacing="none"
      >
        {(provided, snapshot) => (
          <NestedView
            last={globalIndex === routing.length - 1}
            first={globalIndex === 0}
            isBeingDragged={snapshot.isDragging}
          >
            {currentRuleId === routingRule.id ? (
              <EditRoutingStreamEntry onChange={changeRule} routingRule={routingRule} />
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
  );

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
          <EuiDragDropContext onDragStart={handleDragStart} onDragEnd={handlerItemDrag}>
            <EuiFlexGroup direction="column" gutterSize="xs">
              {materializedRules.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiDroppable
                    droppableId={MATERIALIZED_DROPPABLE_ID}
                    spacing="none"
                    isDropDisabled={draggingDroppableId === DRAFT_DROPPABLE_ID}
                  >
                    <EuiFlexGroup direction="column" gutterSize="xs">
                      {materializedRules.map((routingRule, pos) =>
                        renderRoutingRule(routingRule, pos, pos)
                      )}
                    </EuiFlexGroup>
                  </EuiDroppable>
                </EuiFlexItem>
              )}
              {draftRules.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiDroppable
                    droppableId={DRAFT_DROPPABLE_ID}
                    spacing="none"
                    isDropDisabled={draggingDroppableId === MATERIALIZED_DROPPABLE_ID}
                  >
                    <EuiFlexGroup direction="column" gutterSize="xs">
                      {draftRules.map((routingRule, pos) =>
                        renderRoutingRule(routingRule, pos, materializedRules.length + pos)
                      )}
                    </EuiFlexGroup>
                  </EuiDroppable>
                </EuiFlexItem>
              )}
              {newRule && (
                <EuiFlexItem grow={false}>
                  <NestedView last first={routing.length === 1}>
                    <NewRoutingStreamEntry />
                  </NestedView>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
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
                  definition={definition as Streams.WiredStream.GetResponse}
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

function QueryModeChildrenList() {
  const { euiTheme } = useEuiTheme();

  const definition = useStreamsRoutingSelector((snapshot) => snapshot.context.definition);
  const isCreating = useStreamsRoutingSelector((state) =>
    state.matches({ ready: { queryMode: 'creating' } })
  );
  const isEditing = useStreamsRoutingSelector((state) =>
    state.matches({ ready: { queryMode: 'editing' } })
  );
  const editingStreamName = useStreamsRoutingSelector(
    (snapshot) => snapshot.context.editingQueryStreamName
  );
  const { createQueryStream, editQueryStream } = useStreamRoutingEvents();
  const canManage = 'privileges' in definition ? definition.privileges.manage : true;
  const isAtMaxNestingLevel = getSegments(definition.stream.name).length >= MAX_NESTING_LEVEL;

  // Get child query stream names from the definition
  const childQueryStreamNames = useMemo(() => {
    const queryStreams = definition.stream.query_streams ?? [];
    return queryStreams.map((ref) => ref.name);
  }, [definition.stream.query_streams]);

  const showEmptyPrompt = childQueryStreamNames.length === 0 && !isCreating;

  if (showEmptyPrompt) {
    return <QueryModeEmptyPrompt />;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      className={css`
        overflow: auto;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate('xpack.streams.queryModeChildrenList.isolationGuidance', {
              defaultMessage:
                'Query streams have their own data, separate from this stream. Select one below or open it in Discover to view its data.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
      </EuiFlexItem>
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
                {isEditing && editingStreamName === streamName ? (
                  <EditingQueryStreamEntry
                    streamName={streamName}
                    parentStreamName={definition.stream.name}
                  />
                ) : (
                  <IdleQueryStreamEntry
                    streamName={streamName}
                    onEdit={canManage && !isCreating && !isEditing ? editQueryStream : undefined}
                  />
                )}
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
      {!isCreating && !isEditing && (
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
                  isAtMaxNestingLevel
                    ? maxNestingLevelText
                    : !canManage
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
                  disabled={!canManage || isAtMaxNestingLevel}
                >
                  {i18n.translate('xpack.streams.queryModeChildrenList.createQueryStream', {
                    defaultMessage: 'Create query sub-stream',
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
