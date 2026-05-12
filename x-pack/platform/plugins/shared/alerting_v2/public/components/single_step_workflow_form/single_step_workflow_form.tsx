/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { CreateNewWorkflowSubform } from './components/create_new_workflow_subform';
import { ExistingWorkflowSelector } from './components/existing_workflow_selector';
import { getDefaultSingleStepWorkflowType } from './registry';
import type { SingleStepWorkflowFormValue } from './types';

interface SingleStepWorkflowFormProps {
  value: SingleStepWorkflowFormValue;
  onChange: (next: SingleStepWorkflowFormValue) => void;
  isInvalid?: boolean;
  errorMessage?: string;
}

export const createInitialCreateValue = (): SingleStepWorkflowFormValue => {
  const defaultType = getDefaultSingleStepWorkflowType();
  return {
    mode: 'create',
    typeId: defaultType.id,
    connectorId: null,
    params: defaultType.paramsTemplate,
  };
};

export const SingleStepWorkflowForm = ({
  value,
  onChange,
  isInvalid,
  errorMessage,
}: SingleStepWorkflowFormProps) => {
  const handleSelectExisting = useCallback(
    (workflowId: string) => {
      if (value.mode === 'existing' && value.workflowId === workflowId) return;
      onChange({ mode: 'existing', workflowId });
    },
    [onChange, value]
  );

  const handleCreateNew = useCallback(() => {
    if (value.mode === 'create') return;
    onChange(createInitialCreateValue());
  }, [onChange, value.mode]);

  const handleBackToExisting = useCallback(() => {
    if (value.mode === 'existing' && value.workflowId === null) return;
    onChange({ mode: 'existing', workflowId: null });
  }, [onChange, value]);

  if (value.mode === 'existing') {
    return (
      <ExistingWorkflowSelector
        value={value.workflowId}
        onSelect={handleSelectExisting}
        onCreateNew={handleCreateNew}
        isInvalid={isInvalid}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <div data-test-subj="singleStepWorkflowForm">
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.alertingV2.singleStepWorkflow.creatingNew.title', {
                defaultMessage: 'New single-step workflow',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            onClick={handleBackToExisting}
            data-test-subj="singleStepWorkflowBackToExistingLink"
          >
            {i18n.translate('xpack.alertingV2.singleStepWorkflow.creatingNew.backLink', {
              defaultMessage: 'Pick an existing workflow instead',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <CreateNewWorkflowSubform value={value} onChange={onChange} />
    </div>
  );
};
