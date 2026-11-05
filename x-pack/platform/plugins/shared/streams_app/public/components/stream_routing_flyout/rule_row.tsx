/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  type DraggableProvidedDragHandleProps,
  EuiBadge,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RoutingAction } from '../streams_layout/routing/types';
import { isRawCondition, serializeCondition } from './routing_rule_condition';
import type {
  RoutingRuleChanges,
  RoutingRuleDraft,
} from './state_management/routing_flyout_machine';

interface RoutingRuleRowProps {
  rule: RoutingRuleDraft;
  position: number;
  editable: boolean;
  isDragging: boolean;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  onChange: (key: string, changes: RoutingRuleChanges) => void;
  onDelete: (key: string) => void;
}

const actionOptions: Array<{ id: RoutingAction; label: string }> = [
  {
    id: 'move',
    label: i18n.translate('xpack.streams.routingFlyout.rule.moveAction', {
      defaultMessage: 'Move',
    }),
  },
  {
    id: 'copy',
    label: i18n.translate('xpack.streams.routingFlyout.rule.copyAction', {
      defaultMessage: 'Copy',
    }),
  },
];

export function RoutingRuleRow({
  rule,
  position,
  editable,
  onChange,
  onDelete,
  isDragging,
  dragHandleProps,
}: RoutingRuleRowProps) {
  const actionGroupId = useGeneratedHtmlId();
  const { key, condition, action } = rule;
  const isCatchAll = serializeCondition(condition) === undefined;
  const title = i18n.translate('xpack.streams.routingFlyout.rule.title', {
    defaultMessage: 'Rule {position}',
    values: { position },
  });
  const deleteLabel = i18n.translate('xpack.streams.routingFlyout.rule.deleteLabel', {
    defaultMessage: 'Delete rule {position}',
    values: { position },
  });

  const renderCondition = () => {
    if (isRawCondition(condition)) {
      return (
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.streams.routingFlyout.rule.conditionLabel', {
            defaultMessage: 'Condition',
          })}
          helpText={i18n.translate('xpack.streams.routingFlyout.rule.rawConditionHelp', {
            defaultMessage: 'This condition can only be edited in the YAML configuration.',
          })}
        >
          <EuiCode data-test-subj="streamsRoutingRuleRawCondition">{condition.raw}</EuiCode>
        </EuiFormRow>
      );
    }
    const field = condition?.field ?? '';
    const value = condition?.value ?? '';
    return (
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.streams.routingFlyout.rule.fieldLabel', {
              defaultMessage: 'Field',
            })}
          >
            <EuiFieldText
              fullWidth
              compressed
              value={field}
              disabled={!editable}
              placeholder={i18n.translate('xpack.streams.routingFlyout.rule.fieldPlaceholder', {
                defaultMessage: 'attributes["service.name"]',
              })}
              onChange={(event) =>
                onChange(key, { condition: { field: event.target.value, value } })
              }
              data-test-subj="streamsRoutingRuleField"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.streams.routingFlyout.rule.valueLabel', {
              defaultMessage: 'Equals',
            })}
          >
            <EuiFieldText
              fullWidth
              compressed
              value={value}
              disabled={!editable}
              onChange={(event) =>
                onChange(key, { condition: { field, value: event.target.value } })
              }
              data-test-subj="streamsRoutingRuleValue"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj={`streamsRoutingRule-${key}`}
      hasShadow={isDragging}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {rule.condition && (
              <EuiFlexItem grow={false}>
                <EuiPanel
                  color="transparent"
                  hasBorder={false}
                  paddingSize="xs"
                  {...dragHandleProps}
                  aria-label={i18n.translate(
                    'xpack.streams.routingRuleRow.euiButtonIcon.dragHandleLabel',
                    { defaultMessage: 'Drag Handle' }
                  )}
                >
                  <EuiIcon aria-hidden type="dragVertical" />
                </EuiPanel>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{title}</strong>
              </EuiText>
            </EuiFlexItem>
            {isCatchAll ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="streamsRoutingRuleCatchAll">
                  {i18n.translate('xpack.streams.routingFlyout.rule.catchAllBadge', {
                    defaultMessage: 'No condition, matches all remaining data',
                  })}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem />
            {editable ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={deleteLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    aria-label={deleteLabel}
                    onClick={() => onDelete(key)}
                    data-test-subj="streamsRoutingRuleDelete"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>{renderCondition()}</EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.streams.routingFlyout.rule.actionLabel', {
              defaultMessage: 'Action',
            })}
          >
            <EuiButtonGroup
              legend={i18n.translate('xpack.streams.routingFlyout.rule.actionLegend', {
                defaultMessage: 'Action for rule {position}',
                values: { position },
              })}
              name={actionGroupId}
              buttonSize="compressed"
              options={actionOptions}
              idSelected={action}
              isDisabled={!editable}
              onChange={(id) => {
                const selected = actionOptions.find((option) => option.id === id);
                if (selected) {
                  onChange(key, { action: selected.id });
                }
              }}
              data-test-subj="streamsRoutingRuleAction"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
