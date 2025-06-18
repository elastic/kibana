/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiButton,
  EuiToolTip,
  euiDragDropReorder,
  DragDropContextProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import React from 'react';
import { NestedView } from '../../nested_view';
import { CurrentStreamEntry } from './current_stream_entry';
import { NewRoutingStreamEntry } from './new_routing_stream_entry';
import { RoutingStreamEntry } from './routing_stream_entry';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';

export function ChildStreamList({ availableStreams }: { availableStreams: string[] }) {
  const { changeRule, createNewRule, editRule, reorderRules } = useStreamRoutingEvents();
  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);

  const { currentRuleId, definition, routing } = routingSnapshot.context;
  const canCreateRoutingRules = routingSnapshot.can({ type: 'routingRule.create' });
  const canReorderRoutingRules = routingSnapshot.can({ type: 'routingRule.reorder', routing });
  const canManageRoutingRules = definition.privileges.manage;
  const shouldDisplayCreateButton = definition.privileges.simulate;

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
                content={
                  !canManageRoutingRules
                    ? i18n.translate('xpack.streams.streamDetailRouting.rules.onlySimulate', {
                        defaultMessage:
                          "You don't have sufficient privileges to create new streams, only simulate.",
                      })
                    : undefined
                }
              >
                <EuiButton
                  iconType="plus"
                  size="s"
                  data-test-subj="streamsAppStreamDetailRoutingAddRuleButton"
                  onClick={createNewRule}
                  disabled={!canCreateRoutingRules}
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
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
