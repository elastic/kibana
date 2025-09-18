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
  EuiToolTip,
  euiDragDropReorder,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import React from 'react';
import { MAX_NESTING_LEVEL, getSegments } from '@kbn/streams-schema';
import { NestedView } from '../../nested_view';
import { CurrentStreamEntry } from './current_stream_entry';
import { NewRoutingStreamEntry } from './new_routing_stream_entry';
import { IdleRoutingStreamEntry } from './idle_routing_stream_entry';
import { EditRoutingStreamEntry } from './edit_routing_stream_entry';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';

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
  const { euiTheme } = useEuiTheme();
  const { changeRule, createNewRule, editRule, reorderRules } = useStreamRoutingEvents();
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);

  const { currentRuleId, definition, routing } = routingSnapshot.context;
  const canCreateRoutingRules = routingSnapshot.can({ type: 'routingRule.create' });
  const canReorderRoutingRules = routingSnapshot.can({ type: 'routingRule.reorder', routing });
  const canManageRoutingRules = definition.privileges.manage;
  const maxNestingLevel = getSegments(definition.stream.name).length >= MAX_NESTING_LEVEL;
  const shouldDisplayCreateButton = definition.privileges.simulate;

  const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(routing, source.index, destination.index);
      reorderRules(items);
    }
  };

  const renderCreateButton = () => {
    if (!shouldDisplayCreateButton) return null;

    return (
      <EuiFlexItem grow={false} alignItems="flex-start">
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          className={css`
            padding: ${euiTheme.size.l};
            padding-bottom: ${euiTheme.size.xxxxl};
            flex-grow: 1;
            min-height: 120px;
          `}
        >
          <EuiToolTip
            content={getReasonDisabledCreateButton(canManageRoutingRules, maxNestingLevel)}
          >
            <EuiButton
              size="m"
              data-test-subj="streamsAppStreamDetailRoutingAddRuleButton"
              onClick={createNewRule}
              disabled={!canCreateRoutingRules || maxNestingLevel}
            >
              {i18n.translate('xpack.streams.streamDetailRouting.addRule', {
                defaultMessage: 'Create partition manually',
              })}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      className={css`
        display: flex;
      `}
    >
      <EuiFlexItem
        grow={false}
        className={css`
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          min-height: 60px;
          max-height: calc(100% - 120px);
        `}
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="xs"
          className={css`
            padding: 0 16px;
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
        </EuiFlexGroup>
      </EuiFlexItem>

      {renderCreateButton()}
    </EuiFlexGroup>
  );
}
