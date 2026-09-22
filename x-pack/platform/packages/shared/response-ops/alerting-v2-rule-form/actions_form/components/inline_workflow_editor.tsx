/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { getInlineActionStepDefinition } from '../registry';
import type { InlineWorkflowActionDraft } from '../types';
import { ConnectorSelector } from './connector_selector';
import { ParamsEditor } from './params_editor';

export interface InlineWorkflowEditorProps {
  value: InlineWorkflowActionDraft;
  onChange: (next: InlineWorkflowActionDraft) => void;
}

export const InlineWorkflowEditor = ({ value, onChange }: InlineWorkflowEditorProps) => {
  const definition = getInlineActionStepDefinition(value.stepType);
  if (!definition) {
    return null;
  }

  return (
    <div data-test-subj="inlineWorkflowEditor">
      <ConnectorSelector
        connectorTypeId={definition.connectorTypeId}
        value={value.connectorId}
        onChange={(connectorId) => {
          if (connectorId === value.connectorId) return;
          onChange({ ...value, connectorId });
        }}
      />
      {definition.CustomComponent && (
        <definition.CustomComponent value={value} onChange={(nextValue) => onChange(nextValue)} />
      )}
      <EuiSpacer size="m" />
      <ParamsEditor value={value.params} onChange={(params) => onChange({ ...value, params })} />
    </div>
  );
};
