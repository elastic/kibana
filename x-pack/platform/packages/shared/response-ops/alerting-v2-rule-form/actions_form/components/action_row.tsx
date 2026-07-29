/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ActionDraft } from '../types';
import { getActionTemplateKey } from '../types';
import { findActionTemplateCard, getTemplateForAction } from './action_template_cards';
import { InlineWorkflowEditor } from './inline_workflow_editor';
import { WorkflowReferenceSelector } from './workflow_reference_selector';

interface ActionRowProps {
  action: ActionDraft;
  isExpanded: boolean;
  isInvalid: boolean;
  onToggleExpand: (id: string) => void;
  onRemove: (id: string) => void;
  onChange: (updated: ActionDraft) => void;
}

export const ActionRow = ({
  action,
  isExpanded,
  isInvalid,
  onToggleExpand,
  onRemove,
  onChange,
}: ActionRowProps) => {
  const template = getTemplateForAction(action);
  const card = findActionTemplateCard(template);
  const iconType = card?.iconType ?? 'gear';
  const label = card?.label ?? getActionTemplateKey(template);
  const toggleLabel = isExpanded
    ? i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.list.collapseItem', {
        defaultMessage: 'Collapse action',
      })
    : i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.list.expandItem', {
        defaultMessage: 'Expand action',
      });
  const removeLabel = i18n.translate(
    'xpack.responseOps.alertingV2RuleForm.actionForm.list.removeItem',
    {
      defaultMessage: 'Remove action',
    }
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s" data-test-subj={`actionRow-${action.id}`}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="m" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{label}</strong>
          </EuiText>
        </EuiFlexItem>
        {isInvalid && (
          <EuiFlexItem grow={false}>
            <EuiIcon
              type="warning"
              color="danger"
              size="s"
              aria-label={i18n.translate(
                'xpack.responseOps.alertingV2RuleForm.actionForm.list.itemInvalid',
                {
                  defaultMessage: 'This action is incomplete',
                }
              )}
              data-test-subj={`actionRowInvalid-${action.id}`}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiToolTip content={toggleLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
              aria-label={toggleLabel}
              onClick={() => onToggleExpand(action.id)}
              data-test-subj={`actionRowToggle-${action.id}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={removeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              aria-label={removeLabel}
              onClick={() => onRemove(action.id)}
              data-test-subj={`actionRowRemove-${action.id}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isExpanded && (
        <>
          <EuiSpacer size="m" />
          {action.source === 'existing' ? (
            <WorkflowReferenceSelector
              value={action.workflowId}
              onSelect={(workflowId) => onChange({ ...action, workflowId })}
              isInvalid={isInvalid}
              errorMessage={
                isInvalid
                  ? i18n.translate(
                      'xpack.responseOps.alertingV2RuleForm.actionForm.list.workflowRequiredError',
                      { defaultMessage: 'A workflow must be selected.' }
                    )
                  : undefined
              }
            />
          ) : (
            <InlineWorkflowEditor value={action} onChange={onChange} />
          )}
        </>
      )}
    </EuiPanel>
  );
};
