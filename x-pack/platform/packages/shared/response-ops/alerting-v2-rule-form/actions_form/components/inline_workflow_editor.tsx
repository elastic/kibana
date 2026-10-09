/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useState } from 'react';
import { validateInlineAction } from '../helpers/validate_inline_action';
import { getInlineActionStepDefinition } from '../registry';
import type { ConnectorCreationConfig, InlineWorkflowActionDraft } from '../types';
import { ConnectorSelector } from './connector_selector';
import { ParamsEditor } from './params_editor';

export interface InlineWorkflowEditorProps {
  value: InlineWorkflowActionDraft;
  onChange: (next: InlineWorkflowActionDraft) => void;
  connectorCreationConfig?: ConnectorCreationConfig;
  /**
   * Shows every validation error, including on fields the user has not touched
   * yet (e.g. after a submit attempt).
   */
  forceShowErrors?: boolean;
}

export const InlineWorkflowEditor = ({
  value,
  onChange,
  connectorCreationConfig,
  forceShowErrors = false,
}: InlineWorkflowEditorProps) => {
  const [isConnectorTouched, setIsConnectorTouched] = useState(false);
  const [areParamsTouched, setAreParamsTouched] = useState(false);

  const definition = getInlineActionStepDefinition(value.stepType);
  if (!definition) {
    return null;
  }

  const errors = validateInlineAction(value);
  const connectorError = forceShowErrors || isConnectorTouched ? errors.connector : undefined;
  const paramErrors = forceShowErrors || areParamsTouched ? errors.params : [];

  const onParamsChange = (next: InlineWorkflowActionDraft) => {
    setAreParamsTouched(true);
    onChange(next);
  };

  return (
    <div data-test-subj="inlineWorkflowEditor">
      <ConnectorSelector
        connectorTypeId={definition.connectorTypeId}
        value={value.connectorId}
        connectorCreationConfig={connectorCreationConfig}
        error={connectorError}
        onBlur={() => setIsConnectorTouched(true)}
        onChange={(connectorId) => {
          setIsConnectorTouched(true);
          if (connectorId === value.connectorId) return;
          onChange({ ...value, connectorId });
        }}
      />
      {definition.CustomComponent && (
        <definition.CustomComponent
          value={value}
          onChange={onParamsChange}
          paramErrors={paramErrors}
        />
      )}
      <EuiSpacer size="m" />
      <ParamsEditor
        value={value.params}
        onChange={(params) => onParamsChange({ ...value, params })}
        errors={paramErrors.map(({ message }) => message)}
      />
    </div>
  );
};
