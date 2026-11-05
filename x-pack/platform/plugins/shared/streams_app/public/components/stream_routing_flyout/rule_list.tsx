/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { OnDragEndResponder } from '@hello-pangea/dnd';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { RoutingRuleRow } from './rule_row';
import {
  hasCatchAllRule,
  type RoutingRuleChanges,
  type RoutingRuleDraft,
} from './state_management/routing_flyout_machine';

interface RoutingRuleListProps {
  rules: RoutingRuleDraft[];
  editable: boolean;
  onAdd: () => void;
  onChange: (key: string, changes: RoutingRuleChanges) => void;
  onDelete: (key: string) => void;
  onReorder: (from: number, to: number) => void;
}

export function RoutingRuleList({
  rules,
  editable,
  onAdd,
  onChange,
  onDelete,
  onReorder,
}: RoutingRuleListProps) {
  const dragAreaId = useGeneratedHtmlId();

  const onDragEnd: OnDragEndResponder = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        onReorder(source.index, destination.index);
      }
    },
    [onReorder]
  );

  return (
    <>
      {!hasCatchAllRule(rules) ? (
        <>
          <KbnWarningCallout
            size="s"
            title={i18n.translate('xpack.streams.routingFlyout.unmatchedDataWarning', {
              defaultMessage:
                'Some data doesn’t match any of these conditions and will be dropped. To keep it, add a rule with no condition',
            })}
            data-test-subj="streamsRoutingFlyoutUnmatchedDataWarning"
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable droppableId={dragAreaId} spacing="none">
          <EuiFlexGroup direction="column" gutterSize="m">
            {rules.map((rule, index) => (
              <EuiDraggable
                spacing="m"
                key={rule.key}
                index={index}
                draggableId={rule.key}
                usePortal
                customDragHandle={true}
                hasInteractiveChildren={true}
              >
                {(provided, state) => (
                  <EuiFlexItem>
                    <RoutingRuleRow
                      rule={rule}
                      position={index + 1}
                      editable={editable}
                      onChange={onChange}
                      onDelete={onDelete}
                      isDragging={state.isDragging}
                      dragHandleProps={provided.dragHandleProps}
                    />
                  </EuiFlexItem>
                )}
              </EuiDraggable>
            ))}
          </EuiFlexGroup>
        </EuiDroppable>
      </EuiDragDropContext>

      {editable ? (
        <>
          <EuiSpacer size="m" />
          <EuiButton
            iconType="plusCircle"
            size="s"
            onClick={onAdd}
            data-test-subj="streamsRoutingFlyoutAddRule"
          >
            {i18n.translate('xpack.streams.routingFlyout.addRule', {
              defaultMessage: 'Add rule',
            })}
          </EuiButton>
        </>
      ) : null}
    </>
  );
}
