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
import { getSingleStepWorkflowType } from '../registry';
import type { ConnectorBackedItem, SingleStepWorkflowItem } from '../types';
import { ConnectorSelector } from './connector_selector';
import { ParamsEditor } from './params_editor';
import { WORKFLOW_FORM_CARDS } from './workflow_cards';
import { WorkflowReferenceSelector } from './workflow_reference_selector';

interface WorkflowItemRowProps {
  item: SingleStepWorkflowItem;
  isExpanded: boolean;
  isInvalid: boolean;
  onToggleExpand: (id: string) => void;
  onRemove: (id: string) => void;
  onChange: (updated: SingleStepWorkflowItem) => void;
}

export const WorkflowItemRow = ({
  item,
  isExpanded,
  isInvalid,
  onToggleExpand,
  onRemove,
  onChange,
}: WorkflowItemRowProps) => {
  const card = WORKFLOW_FORM_CARDS.find((c) => c.kind === item.kind);
  const iconType = card?.iconType ?? 'gear';
  const kindLabel = card?.label ?? item.kind;
  const toggleLabel = isExpanded
    ? i18n.translate('xpack.alertingV2.singleStepWorkflow.list.collapseItem', {
        defaultMessage: 'Collapse action',
      })
    : i18n.translate('xpack.alertingV2.singleStepWorkflow.list.expandItem', {
        defaultMessage: 'Expand action',
      });
  const removeLabel = i18n.translate('xpack.alertingV2.singleStepWorkflow.list.removeItem', {
    defaultMessage: 'Remove action',
  });

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      data-test-subj={`workflowItemRow-${item.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="m" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{kindLabel}</strong>
          </EuiText>
        </EuiFlexItem>
        {isInvalid && (
          <EuiFlexItem grow={false}>
            <EuiIcon
              type="warning"
              color="danger"
              size="s"
              aria-label={i18n.translate('xpack.alertingV2.singleStepWorkflow.list.itemInvalid', {
                defaultMessage: 'This action is incomplete',
              })}
              data-test-subj={`workflowItemRowInvalid-${item.id}`}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiToolTip content={toggleLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
              aria-label={toggleLabel}
              onClick={() => onToggleExpand(item.id)}
              data-test-subj={`workflowItemRowToggle-${item.id}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={removeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              aria-label={removeLabel}
              onClick={() => onRemove(item.id)}
              data-test-subj={`workflowItemRowRemove-${item.id}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isExpanded && (
        <>
          <EuiSpacer size="m" />
          {item.kind === 'workflow' && (
            <WorkflowReferenceSelector
              value={item.workflowId}
              onSelect={(workflowId) => onChange({ ...item, workflowId })}
              isInvalid={isInvalid}
              errorMessage={
                isInvalid
                  ? i18n.translate(
                      'xpack.alertingV2.singleStepWorkflow.list.workflowRequiredError',
                      { defaultMessage: 'A workflow must be selected.' }
                    )
                  : undefined
              }
            />
          )}
          {(item.kind === 'slack' || item.kind === 'email') && (
            <>
              <ConnectorSelector
                connectorTypeId={getSingleStepWorkflowType(item.kind)!.connectorTypeId}
                value={item.connectorId}
                onChange={(connectorId) => {
                  if (connectorId === item.connectorId) return;
                  onChange({ ...(item as ConnectorBackedItem), connectorId });
                }}
              />
              <EuiSpacer size="m" />
              <ParamsEditor
                value={item.params}
                onChange={(params) => onChange({ ...(item as ConnectorBackedItem), params })}
              />
            </>
          )}
        </>
      )}
    </EuiPanel>
  );
};
