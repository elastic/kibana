/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { getSingleStepWorkflowType } from '../registry';
import type { CreateWorkflowFormValue, SingleStepWorkflowTypeId } from '../types';
import { ConnectorSelector } from './connector_selector';
import { ParamsEditor } from './params_editor';
import { SingleStepTypeSelector } from './single_step_type_selector';

interface CreateNewWorkflowSubformProps {
  value: CreateWorkflowFormValue;
  onChange: (next: CreateWorkflowFormValue) => void;
}

export const CreateNewWorkflowSubform = ({ value, onChange }: CreateNewWorkflowSubformProps) => {
  const currentType = getSingleStepWorkflowType(value.typeId);

  const handleTypeChange = useCallback(
    (nextTypeId: SingleStepWorkflowTypeId) => {
      if (nextTypeId === value.typeId) return;
      const nextType = getSingleStepWorkflowType(nextTypeId);
      if (!nextType) return;
      onChange({
        ...value,
        typeId: nextTypeId,
        connectorId: null,
        params: nextType.paramsTemplate,
      });
    },
    [onChange, value]
  );

  const handleConnectorChange = useCallback(
    (connectorId: string | null) => {
      if (connectorId === value.connectorId) return;
      onChange({ ...value, connectorId });
    },
    [onChange, value]
  );

  const handleParamsChange = useCallback(
    (params: string) => {
      if (params === value.params) return;
      onChange({ ...value, params });
    },
    [onChange, value]
  );

  if (!currentType) {
    return null;
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      data-test-subj="singleStepWorkflowSubform"
    >
      <SingleStepTypeSelector value={value.typeId} onChange={handleTypeChange} />
      <EuiSpacer size="m" />
      <ConnectorSelector
        connectorTypeId={currentType.connectorTypeId}
        value={value.connectorId}
        onChange={handleConnectorChange}
      />
      <EuiSpacer size="m" />
      <ParamsEditor value={value.params} onChange={handleParamsChange} />
    </EuiPanel>
  );
};
