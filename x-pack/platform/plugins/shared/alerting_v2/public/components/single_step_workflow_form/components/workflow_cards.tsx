/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SINGLE_STEP_WORKFLOW_TYPES } from '../registry';
import type { SingleStepWorkflowKind } from '../types';

interface WorkflowFormCard {
  kind: SingleStepWorkflowKind;
  label: string;
  description: string;
  iconType: string;
}

export const WORKFLOW_FORM_CARDS: readonly WorkflowFormCard[] = [
  {
    kind: 'workflow',
    label: i18n.translate('xpack.alertingV2.singleStepWorkflow.card.workflow.label', {
      defaultMessage: 'Workflow',
    }),
    description: i18n.translate('xpack.alertingV2.singleStepWorkflow.card.workflow.description', {
      defaultMessage: 'Select an existing workflow',
    }),
    iconType: 'workflowsApp',
  },
  ...SINGLE_STEP_WORKFLOW_TYPES.map((type) => ({
    kind: type.id as SingleStepWorkflowKind,
    label: type.label,
    description: type.description ?? '',
    iconType: type.iconType ?? 'gear',
  })),
];

interface WorkflowCardsProps {
  onPick: (kind: SingleStepWorkflowKind) => void;
  onCancel?: () => void;
}

export const WorkflowCards = ({ onPick, onCancel }: WorkflowCardsProps) => (
  <>
    <EuiFlexGroup direction="column" gutterSize="s">
      {WORKFLOW_FORM_CARDS.map((card) => (
        <EuiFlexItem key={card.kind}>
          <EuiCard
            paddingSize="s"
            layout="horizontal"
            display="plain"
            hasBorder
            titleSize="xs"
            icon={<EuiIcon type={card.iconType} size="l" aria-hidden={true} />}
            title={card.label}
            description={card.description}
            onClick={() => onPick(card.kind)}
            data-test-subj={`singleStepWorkflowCard-${card.kind}`}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
    {onCancel && (
      <>
        <EuiSpacer size="s" />
        <EuiLink onClick={onCancel} data-test-subj="singleStepWorkflowCancelPicker">
          {i18n.translate('xpack.alertingV2.singleStepWorkflow.list.cancelPicker', {
            defaultMessage: 'Cancel',
          })}
        </EuiLink>
      </>
    )}
  </>
);
