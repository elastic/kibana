/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  type DraggableProvidedDragHandleProps,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiRadioGroup,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { UnitSignal } from '../../services/unit_pipeline';
import { ROUTING_SIGNAL_LABELS } from './signal_labels';
import { normalizeWhen } from './routing_rule_condition';
import {
  isDefaultRule,
  type RoutingAction,
  type RoutingRuleChanges,
  type RoutingRuleDraft,
} from './state_management/routing_flyout_machine';

interface RoutingRuleRowProps {
  rule: RoutingRuleDraft;
  position: number;
  availableSignals: UnitSignal[];
  editable: boolean;
  isDragging: boolean;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  onChange: (key: string, changes: RoutingRuleChanges) => void;
  onDelete: (key: string) => void;
}

const actionLabels: Readonly<Record<RoutingAction, string>> = {
  move: i18n.translate('xpack.streams.routingFlyout.rule.moveAction', {
    defaultMessage: 'Move',
  }),
  copy: i18n.translate('xpack.streams.routingFlyout.rule.copyAction', {
    defaultMessage: 'Copy',
  }),
};

const actionDescriptions: Readonly<Record<RoutingAction, string>> = {
  move: i18n.translate('xpack.streams.routingFlyout.rule.moveDescription', {
    defaultMessage: 'Route data exclusively',
  }),
  copy: i18n.translate('xpack.streams.routingFlyout.rule.copyDescription', {
    defaultMessage: 'Create a copy of the data',
  }),
};

const routingActions: readonly RoutingAction[] = ['move', 'copy'];

type RoutingRuleEdit = Pick<RoutingRuleDraft, 'when' | 'action' | 'telemetry'>;

/** A rule added in the flyout has an empty condition until it is applied, so it opens ready to edit. */
const isUnsetCondition = ({ when }: RoutingRuleDraft): boolean => when === '';

function RoutingRuleView({ rule: { when, action, telemetry } }: { rule: RoutingRuleDraft }) {
  const condition = normalizeWhen(when);
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
      <EuiFlexItem>
        {condition !== undefined ? (
          <EuiCode data-test-subj="streamsRoutingRuleCondition">{condition}</EuiCode>
        ) : action === 'copy' ? (
          <EuiText data-test-subj="streamsRoutingRuleCatchAll">
            {i18n.translate('xpack.streams.routingFlyout.rule.copyAllBadge', {
              defaultMessage: 'No condition, copies all data',
            })}
          </EuiText>
        ) : (
          <EuiText data-test-subj="streamsRoutingRuleCatchAll">
            {i18n.translate('xpack.streams.routingFlyout.rule.catchAllBadge', {
              defaultMessage: 'No condition, matches all remaining data',
            })}
          </EuiText>
        )}
      </EuiFlexItem>
      {telemetry.map((signal) => (
        <EuiFlexItem key={signal} grow={false}>
          <EuiBadge color="default" data-test-subj={`streamsRoutingRuleSignal-${signal}`}>
            {ROUTING_SIGNAL_LABELS[signal]}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function RoutingConditionForm({
  when,
  onChange,
}: {
  when: string | undefined;
  onChange: (when: string) => void;
}) {
  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.streams.routingFlyout.rule.conditionLabel', {
        defaultMessage: 'Condition',
      })}
      helpText={i18n.translate('xpack.streams.routingFlyout.rule.conditionHelp', {
        defaultMessage: 'An OTTL condition. Leave it empty to match all remaining data.',
      })}
    >
      <EuiFieldText
        fullWidth
        compressed
        value={when ?? ''}
        placeholder='resource.attributes["env"] == "prod"'
        onChange={(event) => onChange(event.target.value)}
        data-test-subj="streamsRoutingRuleConditionInput"
      />
    </EuiFormRow>
  );
}

function RoutingRuleEditForm({
  draft,
  availableSignals,
  isCreated,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: RoutingRuleEdit;
  availableSignals: UnitSignal[];
  isCreated: boolean;
  onChange: (draft: RoutingRuleEdit) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const actionGroupId = useGeneratedHtmlId();
  const hasNoSignals = draft.telemetry.length === 0;
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <RoutingConditionForm when={draft.when} onChange={(when) => onChange({ ...draft, when })} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.streams.routingFlyout.rule.signalsLabel', {
            defaultMessage: 'Telemetry signals',
          })}
          helpText={i18n.translate('xpack.streams.routingFlyout.rule.signalsHelp', {
            defaultMessage: 'Signals the incoming data can send to this rule.',
          })}
          isInvalid={hasNoSignals}
          error={i18n.translate('xpack.streams.routingFlyout.rule.signalsRequiredError', {
            defaultMessage: 'Select at least one signal.',
          })}
        >
          <EuiComboBox
            fullWidth
            compressed
            isClearable={false}
            isInvalid={hasNoSignals}
            options={availableSignals.map((signal) => ({
              label: ROUTING_SIGNAL_LABELS[signal],
              value: signal,
            }))}
            selectedOptions={draft.telemetry.map((signal) => ({
              label: ROUTING_SIGNAL_LABELS[signal],
              value: signal,
            }))}
            onChange={(selected) =>
              onChange({
                ...draft,
                telemetry: availableSignals.filter((signal) =>
                  selected.some(({ value }) => value === signal)
                ),
              })
            }
            data-test-subj="streamsRoutingRuleSignals"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiRadioGroup
          name={actionGroupId}
          legend={{
            children: i18n.translate('xpack.streams.routingFlyout.rule.actionLabel', {
              defaultMessage: 'What should the condition do with the data?',
            }),
          }}
          options={routingActions.map((id) => ({
            id: `${actionGroupId}-${id}`,
            label: actionDescriptions[id],
          }))}
          idSelected={`${actionGroupId}-${draft.action}`}
          onChange={(optionId) => {
            const selected = routingActions.find((id) => optionId === `${actionGroupId}-${id}`);
            if (selected) {
              onChange({ ...draft, action: selected });
            }
          }}
          data-test-subj="streamsRoutingRuleAction"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="s" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={onCancel} data-test-subj="streamsRoutingRuleCancel">
              {i18n.translate('xpack.streams.routingFlyout.rule.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              isDisabled={hasNoSignals}
              onClick={onSubmit}
              data-test-subj="streamsRoutingRuleSubmit"
            >
              {isCreated
                ? i18n.translate('xpack.streams.routingFlyout.rule.apply', {
                    defaultMessage: 'Apply',
                  })
                : i18n.translate('xpack.streams.routingFlyout.rule.create', {
                    defaultMessage: 'Create',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function RoutingRuleRow({
  rule,
  position,
  availableSignals,
  editable,
  onChange,
  onDelete,
  isDragging,
  dragHandleProps,
}: RoutingRuleRowProps) {
  const { euiTheme } = useEuiTheme();
  const { key, when, action, telemetry } = rule;
  // A new rule is only created once its form is submitted; cancelling it removes the rule.
  const [isCreated, setIsCreated] = useState(() => !isUnsetCondition(rule));
  // Edits stay in the row until they are applied, so cancelling leaves the rule unchanged.
  const [edit, setEdit] = useState<RoutingRuleEdit | undefined>(() =>
    isUnsetCondition(rule) ? { when, action, telemetry } : undefined
  );
  const isEditing = editable && edit !== undefined;
  const isCatchAll = isDefaultRule(rule);
  const title = !isCreated
    ? i18n.translate('xpack.streams.routingFlyout.rule.creatingTitle', {
        defaultMessage: 'Creating route rule',
      })
    : isCatchAll
    ? i18n.translate('xpack.streams.routingFlyout.rule.defaultTitle', {
        defaultMessage: 'Default',
      })
    : i18n.translate('xpack.streams.routingFlyout.rule.title', {
        defaultMessage: 'Rule {position}',
        values: { position },
      });
  const deleteLabel = i18n.translate('xpack.streams.routingFlyout.rule.deleteLabel', {
    defaultMessage: 'Delete rule {position}',
    values: { position },
  });
  const editLabel = i18n.translate('xpack.streams.routingFlyout.rule.editLabel', {
    defaultMessage: 'Edit rule {position}',
    values: { position },
  });

  const cancelEdit = () => {
    if (isCreated) {
      setEdit(undefined);
    } else {
      onDelete(key);
    }
  };
  const submitEdit = () => {
    if (edit) {
      onChange(key, edit);
    }
    setEdit(undefined);
    setIsCreated(true);
  };

  return (
    <EuiPanel
      color="subdued"
      paddingSize="m"
      data-test-subj={`streamsRoutingRule-${key}`}
      hasShadow={isDragging}
      css={css`
        border: 1px solid ${euiTheme.border.color};
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {editable && !isCatchAll && (
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
              <EuiBadge>{position}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{title}</strong>
              </EuiText>
            </EuiFlexItem>
            {action === 'copy' ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="neutral" data-test-subj="streamsRoutingRuleActionSummary">
                  {actionLabels[action]}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem />
            {editable && !isEditing ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={editLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="pencil"
                    aria-label={editLabel}
                    onClick={() => setEdit({ when, action, telemetry })}
                    data-test-subj="streamsRoutingRuleEditToggle"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
            {editable && !isEditing ? (
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
        <EuiFlexItem>
          {isEditing && edit ? (
            <RoutingRuleEditForm
              draft={edit}
              availableSignals={availableSignals}
              isCreated={isCreated}
              onChange={setEdit}
              onCancel={cancelEdit}
              onSubmit={submitEdit}
            />
          ) : (
            <RoutingRuleView rule={rule} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
