/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { ConnectorSelector } from './components/connector_selector';
import { ParamsEditor } from './components/params_editor';
import { WORKFLOW_FORM_CARDS, WorkflowCards } from './components/workflow_cards';
import { WorkflowPanelHeader } from './components/workflow_panel_header';
import { WorkflowReferenceSelector } from './components/workflow_reference_selector';
import { getSingleStepWorkflowType } from './registry';
import type { SingleStepWorkflowFormValue, SingleStepWorkflowKind } from './types';

interface SingleStepWorkflowFormProps {
  value: SingleStepWorkflowFormValue;
  onChange: (next: SingleStepWorkflowFormValue) => void;
  isInvalid?: boolean;
  errorMessage?: string;
}

export const createInitialValue = (): SingleStepWorkflowFormValue => ({ kind: 'unselected' });

export const SingleStepWorkflowForm = ({
  value,
  onChange,
  isInvalid,
  errorMessage,
}: SingleStepWorkflowFormProps) => {
  const handlePick = (kind: Exclude<SingleStepWorkflowKind, 'unselected'>) => {
    if (kind === 'workflow') {
      onChange({ kind: 'workflow', workflowId: null });
      return;
    }
    const type = getSingleStepWorkflowType(kind);
    if (!type) return;
    onChange({ kind, connectorId: null, params: type.paramsTemplate });
  };

  const handleBack = () => onChange({ kind: 'unselected' });

  if (value.kind === 'unselected') {
    return <WorkflowCards onPick={handlePick} />;
  }

  const card = WORKFLOW_FORM_CARDS.find((c) => c.kind === value.kind)!;

  return (
    <div data-test-subj="singleStepWorkflowForm">
      <WorkflowPanelHeader iconType={card.iconType} title={card.label} onBack={handleBack} />
      <EuiSpacer size="m" />
      {value.kind === 'workflow' && (
        <WorkflowReferenceSelector
          value={value.workflowId}
          onSelect={(workflowId) => onChange({ kind: 'workflow', workflowId })}
          isInvalid={isInvalid}
          errorMessage={errorMessage}
        />
      )}
      {(value.kind === 'slack' || value.kind === 'email') && (
        <EuiPanel
          hasShadow={false}
          hasBorder
          paddingSize="m"
          data-test-subj="singleStepWorkflowSubform"
        >
          <ConnectorSelector
            connectorTypeId={getSingleStepWorkflowType(value.kind)!.connectorTypeId}
            value={value.connectorId}
            onChange={(connectorId) => {
              if (connectorId === value.connectorId) return;
              onChange({ ...value, connectorId });
            }}
          />
          <EuiSpacer size="m" />
          <ParamsEditor
            value={value.params}
            onChange={(params) => onChange({ ...value, params })}
          />
        </EuiPanel>
      )}
    </div>
  );
};
