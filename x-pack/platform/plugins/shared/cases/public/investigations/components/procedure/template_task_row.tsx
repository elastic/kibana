/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { PROPOSAL_CATEGORIES } from '../../../../common/investigations/types';
import type { TaskOwnerType, TaskPriority } from '../../../../common/investigations/types';
import { CRITICAL, HIGH, LOW, MEDIUM } from '../../../components/severity/translations';
import type { WorkflowListItem } from '../../api/client';
import { ICONS } from '../../icons';
import { OWNER_TYPES, OWNER_TYPE_LABELS, PHASES, TASK_PRIORITIES } from './procedure_helpers';
import { DUE_UNITS } from './template_draft';
import type {
  AutoKind,
  DraftErrors,
  DraftFieldErrors,
  DraftSubtask,
  DraftTask,
  DueUnit,
} from './template_draft';
import * as i18n from './translations';

const AUTO_KINDS: readonly AutoKind[] = ['manual', 'claim', 'action'];

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: LOW,
  medium: MEDIUM,
  high: HIGH,
  critical: CRITICAL,
};
const DUE_UNIT_LABELS: Record<DueUnit, string> = {
  minutes: i18n.UNIT_MINUTES,
  hours: i18n.UNIT_HOURS,
  days: i18n.UNIT_DAYS,
};

const autoKindLabel = (kind: AutoKind): string =>
  kind === 'claim'
    ? i18n.EDITOR_WHEN_CLAIM
    : kind === 'action'
    ? i18n.EDITOR_WHEN_ACTION
    : i18n.EDITOR_MANUAL;

const PrioritySelect: React.FC<{
  value: TaskPriority;
  isDisabled: boolean;
  onChange: (priority: TaskPriority) => void;
  'data-test-subj': string;
}> = ({ value, isDisabled, onChange, 'data-test-subj': dataTestSubj }) => (
  <EuiSelect
    compressed
    disabled={isDisabled}
    value={value}
    options={TASK_PRIORITIES.map((priority) => ({
      value: priority,
      text: PRIORITY_LABELS[priority],
    }))}
    aria-label={i18n.EDITOR_PRIORITY}
    onChange={(event) =>
      onChange(TASK_PRIORITIES.find((priority) => priority === event.target.value) ?? value)
    }
    data-test-subj={dataTestSubj}
  />
);
PrioritySelect.displayName = 'PrioritySelect';

/** "Due within": a number and a unit. Empty means no deadline. */
const DueWithinField: React.FC<{
  value: string;
  unit: DueUnit;
  error?: string;
  isDisabled: boolean;
  onChange: (patch: { dueValue?: string; dueUnit?: DueUnit }) => void;
  'data-test-subj': string;
}> = ({ value, unit, error, isDisabled, onChange, 'data-test-subj': dataTestSubj }) => (
  <EuiFormRow
    label={i18n.EDITOR_DUE_WITHIN}
    helpText={error ? undefined : i18n.EDITOR_DUE_WITHIN_HELP}
    isInvalid={Boolean(error)}
    error={error}
    display="rowCompressed"
  >
    <EuiFlexGroup gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFieldNumber
          compressed
          min={1}
          css={css`
            width: 96px;
          `}
          disabled={isDisabled}
          value={value}
          isInvalid={Boolean(error)}
          aria-label={i18n.EDITOR_DUE_WITHIN}
          onChange={(event) => onChange({ dueValue: event.target.value })}
          data-test-subj={`${dataTestSubj}-value`}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          disabled={isDisabled}
          value={unit}
          options={DUE_UNITS.map((option) => ({ value: option, text: DUE_UNIT_LABELS[option] }))}
          aria-label={i18n.EDITOR_DUE_WITHIN_UNIT}
          onChange={(event) =>
            onChange({ dueUnit: DUE_UNITS.find((option) => option === event.target.value) ?? unit })
          }
          data-test-subj={`${dataTestSubj}-unit`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFormRow>
);
DueWithinField.displayName = 'DueWithinField';

const SubtaskRow: React.FC<{
  subtask: DraftSubtask;
  taskIndex: number;
  subtaskIndex: number;
  errors?: DraftFieldErrors;
  readOnly: boolean;
  onChange: (patch: Partial<DraftSubtask>) => void;
  onRemove: () => void;
}> = ({ subtask, taskIndex, subtaskIndex, errors, readOnly, onChange, onRemove }) => {
  const { euiTheme } = useEuiTheme();
  const requiredId = useGeneratedHtmlId();
  const testSubj = `investigationTemplateSubtask-${taskIndex}-${subtaskIndex}`;

  return (
    <div
      data-test-subj={testSubj}
      css={css`
        margin-block-start: ${euiTheme.size.s};
        padding-inline-start: ${euiTheme.size.base};
        border-inline-start: ${euiTheme.border.thick};
        border-color: ${euiTheme.colors.lightShade};
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" wrap responsive={false}>
        <EuiFlexItem
          css={css`
            min-width: 220px;
          `}
        >
          <EuiFormRow
            label={i18n.EDITOR_SUBTASK_TITLE}
            isInvalid={Boolean(errors?.title)}
            error={errors?.title}
            display="rowCompressed"
            fullWidth
          >
            <EuiFieldText
              compressed
              fullWidth
              disabled={readOnly}
              placeholder={i18n.EDITOR_SUBTASK_TITLE}
              value={subtask.title}
              isInvalid={Boolean(errors?.title)}
              onChange={(event) => onChange({ title: event.target.value })}
              data-test-subj={`${testSubj}-title`}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.EDITOR_PRIORITY} display="rowCompressed">
            <PrioritySelect
              value={subtask.priority}
              isDisabled={readOnly}
              onChange={(priority) => onChange({ priority })}
              data-test-subj={`${testSubj}-priority`}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DueWithinField
            value={subtask.dueValue}
            unit={subtask.dueUnit}
            error={errors?.dueWithin}
            isDisabled={readOnly}
            onChange={onChange}
            data-test-subj={`${testSubj}-due`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace display="rowCompressed">
            <EuiCheckbox
              id={requiredId}
              label={i18n.EDITOR_REQUIRED}
              disabled={readOnly}
              checked={subtask.required}
              onChange={(event) => onChange({ required: event.target.checked })}
              data-test-subj={`${testSubj}-required`}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {readOnly ? null : (
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace display="rowCompressed">
              <EuiToolTip content={i18n.EDITOR_REMOVE_SUBTASK} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={ICONS.trash}
                  color="danger"
                  aria-label={i18n.EDITOR_REMOVE_SUBTASK}
                  onClick={onRemove}
                  data-test-subj={`${testSubj}-remove`}
                />
              </EuiToolTip>
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
SubtaskRow.displayName = 'SubtaskRow';

export interface TemplateTaskRowProps {
  draft: DraftTask;
  index: number;
  /** Other tasks of the list this task can start after. */
  afterOptions: readonly DraftTask[];
  /** Workflows an automation task can run; undefined while loading. */
  workflows: readonly WorkflowListItem[] | undefined;
  workflowsError: boolean;
  errors?: DraftErrors;
  readOnly: boolean;
  /** The list has room for another sub-task. */
  canAddSubtask: boolean;
  dragHandle: React.ReactNode;
  onChange: (key: string, patch: Partial<DraftTask>) => void;
  onRemove: (key: string) => void;
  onAddSubtask: (key: string) => void;
  onChangeSubtask: (taskKey: string, subtaskKey: string, patch: Partial<DraftSubtask>) => void;
  onRemoveSubtask: (taskKey: string, subtaskKey: string) => void;
}

export const TemplateTaskRow: React.FC<TemplateTaskRowProps> = ({
  draft,
  index,
  afterOptions,
  workflows,
  workflowsError,
  errors,
  readOnly,
  canAddSubtask,
  dragHandle,
  onChange,
  onRemove,
  onAddSubtask,
  onChangeSubtask,
  onRemoveSubtask,
}) => {
  const requiredId = useGeneratedHtmlId();
  const taskErrors = errors?.task;

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      hasBorder
      data-test-subj={`investigationTemplateTask-${index}`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        {dragHandle ? <EuiFlexItem grow={false}>{dragHandle}</EuiFlexItem> : null}
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.EDITOR_TASK_NUMBER(index + 1)}
          </EuiText>
        </EuiFlexItem>
        {readOnly ? null : (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.EDITOR_REMOVE} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType={ICONS.trash}
                color="danger"
                aria-label={i18n.EDITOR_REMOVE}
                onClick={() => onRemove(draft.key)}
                data-test-subj={`investigationTemplateRemove-${index}`}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiFormRow
        label={i18n.EDITOR_TASK_TITLE}
        isInvalid={Boolean(taskErrors?.title)}
        error={taskErrors?.title}
        display="rowCompressed"
        fullWidth
      >
        <EuiFieldText
          compressed
          fullWidth
          disabled={readOnly}
          value={draft.title}
          isInvalid={Boolean(taskErrors?.title)}
          onChange={(event) => onChange(draft.key, { title: event.target.value })}
          data-test-subj={`investigationTemplateTitle-${index}`}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.EDITOR_DESCRIPTION}
        isInvalid={Boolean(taskErrors?.description)}
        error={taskErrors?.description}
        display="rowCompressed"
        fullWidth
      >
        <EuiFieldText
          compressed
          fullWidth
          disabled={readOnly}
          value={draft.description}
          isInvalid={Boolean(taskErrors?.description)}
          onChange={(event) => onChange(draft.key, { description: event.target.value })}
          data-test-subj={`investigationTemplateDescription-${index}`}
        />
      </EuiFormRow>
      <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.EDITOR_PHASE} display="rowCompressed">
            <EuiSelect
              compressed
              disabled={readOnly}
              value={draft.phase}
              options={PHASES.map((phase) => ({ value: phase, text: phase }))}
              onChange={(event) => {
                const phase = PHASES.find((value) => value === event.target.value);
                if (phase) {
                  onChange(draft.key, { phase });
                }
              }}
              data-test-subj={`investigationTemplatePhase-${index}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.EDITOR_OWNER_TYPE} display="rowCompressed">
            <EuiSelect
              compressed
              disabled={readOnly}
              value={draft.ownerType}
              options={OWNER_TYPES.map((type) => ({ value: type, text: OWNER_TYPE_LABELS[type] }))}
              onChange={(event) => {
                const ownerType: TaskOwnerType | undefined = OWNER_TYPES.find(
                  (value) => value === event.target.value
                );
                if (ownerType) {
                  onChange(draft.key, { ownerType });
                }
              }}
              data-test-subj={`investigationTemplateOwnerType-${index}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {draft.ownerType === 'team' ? (
          <EuiFlexItem grow={false}>
            <EuiFormRow label={i18n.EDITOR_OWNER_NAME} display="rowCompressed">
              <EuiFieldText
                compressed
                disabled={readOnly}
                placeholder={i18n.EDITOR_OWNER_NAME_PLACEHOLDER}
                value={draft.owner}
                onChange={(event) => onChange(draft.key, { owner: event.target.value })}
                data-test-subj={`investigationTemplateOwner-${index}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
        ) : null}
        {draft.ownerType === 'automation' ? (
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={i18n.FIELD_WORKFLOW}
              helpText={workflowsError ? undefined : i18n.FIELD_WORKFLOW_HELP}
              isInvalid={workflowsError}
              error={workflowsError ? i18n.WORKFLOWS_UNAVAILABLE : undefined}
              display="rowCompressed"
            >
              <EuiSelect
                isInvalid={workflowsError}
                compressed
                disabled={readOnly || workflowsError}
                isLoading={workflows === undefined && !workflowsError}
                value={draft.workflowId}
                options={[
                  { value: '', text: i18n.NO_WORKFLOW },
                  ...(workflows ?? []).map((workflow) => ({
                    value: workflow.id,
                    text: workflow.name,
                  })),
                  ...(draft.workflowId && !(workflows ?? []).some((w) => w.id === draft.workflowId)
                    ? [{ value: draft.workflowId, text: draft.workflowId }]
                    : []),
                ]}
                onChange={(event) => onChange(draft.key, { workflowId: event.target.value })}
                data-test-subj={`investigationTemplateWorkflow-${index}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.EDITOR_PRIORITY} display="rowCompressed">
            <PrioritySelect
              value={draft.priority}
              isDisabled={readOnly}
              onChange={(priority) => onChange(draft.key, { priority })}
              data-test-subj={`investigationTemplatePriority-${index}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DueWithinField
            value={draft.dueValue}
            unit={draft.dueUnit}
            error={taskErrors?.dueWithin}
            isDisabled={readOnly}
            onChange={(patch) => onChange(draft.key, patch)}
            data-test-subj={`investigationTemplateDue-${index}`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.EDITOR_COMPLETED_WHEN} display="rowCompressed">
            <EuiSelect
              compressed
              disabled={readOnly}
              value={draft.autoKind}
              options={AUTO_KINDS.map((kind) => ({ value: kind, text: autoKindLabel(kind) }))}
              onChange={(event) => {
                const autoKind = AUTO_KINDS.find((value) => value === event.target.value);
                if (autoKind) {
                  onChange(draft.key, { autoKind });
                }
              }}
              data-test-subj={`investigationTemplateAuto-${index}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {draft.autoKind === 'action' ? (
          <EuiFlexItem grow={false}>
            <EuiFormRow label={i18n.EDITOR_ACTION_CATEGORY} display="rowCompressed">
              <EuiSelect
                compressed
                disabled={readOnly}
                value={draft.actionCategory}
                options={PROPOSAL_CATEGORIES.map((category) => ({
                  value: category,
                  text: category,
                }))}
                onChange={(event) => {
                  const actionCategory = PROPOSAL_CATEGORIES.find(
                    (value) => value === event.target.value
                  );
                  if (actionCategory) {
                    onChange(draft.key, { actionCategory });
                  }
                }}
                data-test-subj={`investigationTemplateCategory-${index}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.EDITOR_AFTER} display="rowCompressed">
            <EuiSelect
              compressed
              disabled={readOnly}
              value={draft.afterKey}
              options={[
                { value: '', text: i18n.EDITOR_AFTER_NONE },
                ...afterOptions
                  .filter((option) => option.key !== draft.key)
                  .map((option) => ({
                    value: option.key,
                    text: option.title.trim() || i18n.EDITOR_NEW_TASK,
                  })),
              ]}
              onChange={(event) => onChange(draft.key, { afterKey: event.target.value })}
              data-test-subj={`investigationTemplateAfter-${index}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace display="rowCompressed">
            <EuiCheckbox
              id={requiredId}
              label={i18n.EDITOR_REQUIRED}
              disabled={readOnly}
              checked={draft.required}
              onChange={(event) => onChange(draft.key, { required: event.target.checked })}
              data-test-subj={`investigationTemplateRequired-${index}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {draft.autoKind === 'claim' ? (
        <EuiFormRow
          label={i18n.EDITOR_CLAIM_QUESTION}
          isInvalid={Boolean(taskErrors?.claimQuestion)}
          error={taskErrors?.claimQuestion}
          display="rowCompressed"
          fullWidth
        >
          <EuiFieldText
            compressed
            fullWidth
            disabled={readOnly}
            value={draft.claimQuestion}
            isInvalid={Boolean(taskErrors?.claimQuestion)}
            onChange={(event) => onChange(draft.key, { claimQuestion: event.target.value })}
            data-test-subj={`investigationTemplateClaimQuestion-${index}`}
          />
        </EuiFormRow>
      ) : null}
      {draft.subtasks.map((subtask, subtaskIndex) => (
        <SubtaskRow
          key={subtask.key}
          subtask={subtask}
          taskIndex={index}
          subtaskIndex={subtaskIndex}
          errors={errors?.subtasks[subtask.key]}
          readOnly={readOnly}
          onChange={(patch) => onChangeSubtask(draft.key, subtask.key, patch)}
          onRemove={() => onRemoveSubtask(draft.key, subtask.key)}
        />
      ))}
      {!readOnly && canAddSubtask ? (
        <EuiButtonEmpty
          size="xs"
          iconType={ICONS.add}
          onClick={() => onAddSubtask(draft.key)}
          data-test-subj={`investigationTemplateAddSubtask-${index}`}
        >
          {i18n.EDITOR_ADD_SUBTASK}
        </EuiButtonEmpty>
      ) : null}
    </EuiPanel>
  );
};
TemplateTaskRow.displayName = 'TemplateTaskRow';
