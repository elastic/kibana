/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { PROPOSAL_CATEGORIES } from '../../../../common/investigations/types';
import type { TaskOwnerType } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { OWNER_TYPES, OWNER_TYPE_LABELS, PHASES } from './procedure_helpers';
import type { AutoKind, DraftTask, DraftTaskErrors } from './template_draft';
import * as i18n from './translations';

export interface TemplateTaskRowProps {
  draft: DraftTask;
  index: number;
  total: number;
  /** Other tasks of the procedure this task can start after. */
  afterOptions: readonly DraftTask[];
  errors?: DraftTaskErrors;
  onChange: (key: string, patch: Partial<DraftTask>) => void;
  onMove: (key: string, direction: -1 | 1) => void;
  onRemove: (key: string) => void;
}

const AUTO_KINDS: readonly AutoKind[] = ['manual', 'claim', 'action'];

const autoKindLabel = (kind: AutoKind): string =>
  kind === 'claim'
    ? i18n.EDITOR_WHEN_CLAIM
    : kind === 'action'
    ? i18n.EDITOR_WHEN_ACTION
    : i18n.EDITOR_MANUAL;

export const TemplateTaskRow: React.FC<TemplateTaskRowProps> = ({
  draft,
  index,
  total,
  afterOptions,
  errors,
  onChange,
  onMove,
  onRemove,
}) => {
  const requiredId = useGeneratedHtmlId();

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      hasBorder
      data-test-subj={`investigationTemplateTask-${index}`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.EDITOR_TASK_NUMBER(index + 1)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.EDITOR_MOVE_UP} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={ICONS.chevronUp}
              aria-label={i18n.EDITOR_MOVE_UP}
              isDisabled={index === 0}
              onClick={() => onMove(draft.key, -1)}
              data-test-subj={`investigationTemplateMoveUp-${index}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.EDITOR_MOVE_DOWN} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={ICONS.chevronDown}
              aria-label={i18n.EDITOR_MOVE_DOWN}
              isDisabled={index === total - 1}
              onClick={() => onMove(draft.key, 1)}
              data-test-subj={`investigationTemplateMoveDown-${index}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
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
      </EuiFlexGroup>
      <EuiFormRow
        label={i18n.EDITOR_TASK_TITLE}
        isInvalid={Boolean(errors?.title)}
        error={errors?.title}
        display="rowCompressed"
        fullWidth
      >
        <EuiFieldText
          compressed
          fullWidth
          value={draft.title}
          isInvalid={Boolean(errors?.title)}
          onChange={(event) => onChange(draft.key, { title: event.target.value })}
          data-test-subj={`investigationTemplateTitle-${index}`}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.EDITOR_DESCRIPTION}
        isInvalid={Boolean(errors?.description)}
        error={errors?.description}
        display="rowCompressed"
        fullWidth
      >
        <EuiFieldText
          compressed
          fullWidth
          value={draft.description}
          isInvalid={Boolean(errors?.description)}
          onChange={(event) => onChange(draft.key, { description: event.target.value })}
          data-test-subj={`investigationTemplateDescription-${index}`}
        />
      </EuiFormRow>
      <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.EDITOR_PHASE} display="rowCompressed">
            <EuiSelect
              compressed
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
        {draft.ownerType === 'team' || draft.ownerType === 'person' ? (
          <EuiFlexItem grow={false}>
            <EuiFormRow label={i18n.EDITOR_OWNER_NAME} display="rowCompressed">
              <EuiFieldText
                compressed
                placeholder={i18n.EDITOR_OWNER_NAME_PLACEHOLDER}
                value={draft.owner}
                onChange={(event) => onChange(draft.key, { owner: event.target.value })}
                data-test-subj={`investigationTemplateOwner-${index}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.EDITOR_COMPLETED_WHEN} display="rowCompressed">
            <EuiSelect
              compressed
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
          isInvalid={Boolean(errors?.claimQuestion)}
          error={errors?.claimQuestion}
          display="rowCompressed"
          fullWidth
        >
          <EuiFieldText
            compressed
            fullWidth
            value={draft.claimQuestion}
            isInvalid={Boolean(errors?.claimQuestion)}
            onChange={(event) => onChange(draft.key, { claimQuestion: event.target.value })}
            data-test-subj={`investigationTemplateClaimQuestion-${index}`}
          />
        </EuiFormRow>
      ) : null}
    </EuiPanel>
  );
};
TemplateTaskRow.displayName = 'TemplateTaskRow';
