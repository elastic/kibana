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
  EuiIconTip,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { OnDragEndResponder } from '@hello-pangea/dnd';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { UnitSignal } from '../../services/unit_pipeline';
import { RoutingRuleRow } from './rule_row';
import {
  hasCatchAllRule,
  type RoutingRuleChanges,
  type RoutingRuleDraft,
} from './state_management/routing_flyout_machine';

interface RoutingRuleListProps {
  rules: RoutingRuleDraft[];
  availableSignals: UnitSignal[];
  editable: boolean;
  onAdd: () => void;
  onChange: (key: string, changes: RoutingRuleChanges) => void;
  onDelete: (key: string) => void;
  onReorder: (from: number, to: number) => void;
}

export function RoutingRuleList({
  rules,
  availableSignals,
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
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.streams.routingFlyout.rulesTitle', {
                defaultMessage: 'Routing rules',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="info"
            color="subdued"
            title={i18n.translate('xpack.streams.routingFlyout.rulesHelpTitle', {
              defaultMessage: 'How routing rules work',
            })}
            content={i18n.translate('xpack.streams.routingFlyout.rulesHelpText', {
              defaultMessage:
                'We check rules top to bottom and send data to the first match. Anything left over goes to a route with no condition.',
            })}
            iconProps={{ 'data-test-subj': 'streamsRoutingFlyoutRulesHelp' }}
          />
        </EuiFlexItem>
        <EuiFlexItem />
        {editable ? (
          <EuiFlexItem grow={false}>
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
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
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
                      availableSignals={availableSignals}
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
    </>
  );
}
