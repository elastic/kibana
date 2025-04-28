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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { cloneDeep } from 'lodash';
import React from 'react';
import { ALWAYS_CONDITION } from '../../../util/condition';
import { NestedView } from '../../nested_view';
import { useRoutingStateContext } from './hooks/routing_state';
import { CurrentStreamEntry } from './current_stream_entry';
import { NewRoutingStreamEntry } from './new_routing_stream_entry';
import { RoutingStreamEntry } from './routing_stream_entry';

export function ChildStreamList({ availableStreams }: { availableStreams: string[] }) {
  const {
    routingAppState: {
      childUnderEdit,
      selectChildUnderEdit,
      childStreams,
      onChildStreamDragEnd,
      onChildStreamDragStart,
      draggingChildStream,
      hasChildStreamsOrderChanged,
    },
    definition,
  } = useRoutingStateContext();
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      className={css`
        overflow: auto;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
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
          {definition.privileges.simulate && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  !definition.privileges.manage
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
                  onClick={() => {
                    selectChildUnderEdit({
                      isNew: true,
                      child: {
                        destination: `${definition.stream.name}.child`,
                        if: cloneDeep(ALWAYS_CONDITION),
                      },
                    });
                  }}
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
        <EuiDragDropContext onDragEnd={onChildStreamDragEnd} onDragStart={onChildStreamDragStart}>
          <EuiDroppable droppableId="routing_children_reordering" spacing="none">
            <EuiFlexGroup direction="column" gutterSize="xs">
              {childStreams.map((child, i) => (
                <EuiFlexItem key={`${child.destination}-${i}-flex-item`} grow={false}>
                  <EuiDraggable
                    key={child.destination}
                    index={i}
                    isDragDisabled={!definition.privileges.manage}
                    draggableId={child.destination}
                    hasInteractiveChildren={true}
                    customDragHandle={true}
                    spacing="none"
                  >
                    {(provided) => (
                      <NestedView
                        key={i}
                        last={!childUnderEdit?.isNew && i === childStreams.length - 1}
                        isBeingDragged={draggingChildStream === child.destination}
                      >
                        <RoutingStreamEntry
                          draggableProvided={provided}
                          disableEditButton={
                            hasChildStreamsOrderChanged || !definition.privileges.manage
                          }
                          child={
                            !childUnderEdit?.isNew &&
                            child.destination === childUnderEdit?.child.destination
                              ? childUnderEdit.child
                              : child
                          }
                          edit={
                            !childUnderEdit?.isNew &&
                            child.destination === childUnderEdit?.child.destination
                          }
                          onEditStateChange={() => {
                            if (child.destination === childUnderEdit?.child.destination) {
                              selectChildUnderEdit(undefined);
                            } else {
                              selectChildUnderEdit({ isNew: false, child });
                            }
                          }}
                          onChildChange={(newChild) => {
                            selectChildUnderEdit({
                              isNew: false,
                              child: newChild,
                            });
                          }}
                          availableStreams={availableStreams}
                        />
                      </NestedView>
                    )}
                  </EuiDraggable>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiDroppable>
        </EuiDragDropContext>
        {childUnderEdit?.isNew && (
          <NestedView last>
            <NewRoutingStreamEntry
              child={childUnderEdit.child}
              onChildChange={(newChild) => {
                if (!newChild) {
                  selectChildUnderEdit(undefined);
                  return;
                }
                selectChildUnderEdit({
                  isNew: true,
                  child: newChild,
                });
              }}
            />
          </NestedView>
        )}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
