/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SINGLE_STEP_WORKFLOW_TYPES } from '../registry';
import type { SingleStepWorkflowTypeId } from '../types';

const renderLabel = (label: string, iconType?: string) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    {iconType ? (
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} size="m" aria-hidden={true} />
      </EuiFlexItem>
    ) : null}
    <EuiFlexItem grow={false}>{label}</EuiFlexItem>
  </EuiFlexGroup>
);

const SINGLE_STEP_TYPE_OPTIONS = SINGLE_STEP_WORKFLOW_TYPES.map((type) => ({
  value: type.id,
  inputDisplay: renderLabel(type.label, type.iconType),
  dropdownDisplay: (
    <>
      <strong>{renderLabel(type.label, type.iconType)}</strong>
      {type.description ? (
        <EuiText size="s" color="subdued">
          <p>{type.description}</p>
        </EuiText>
      ) : null}
    </>
  ),
}));

interface SingleStepTypeSelectorProps {
  value: SingleStepWorkflowTypeId;
  onChange: (next: SingleStepWorkflowTypeId) => void;
}

export const SingleStepTypeSelector = ({ value, onChange }: SingleStepTypeSelectorProps) => (
  <EuiFormRow
    label={i18n.translate('xpack.alertingV2.singleStepWorkflow.type.label', {
      defaultMessage: 'Workflow type',
    })}
    fullWidth
  >
    <EuiSuperSelect
      fullWidth
      data-test-subj="singleStepWorkflowTypeSelect"
      valueOfSelected={value}
      options={SINGLE_STEP_TYPE_OPTIONS}
      onChange={onChange}
    />
  </EuiFormRow>
);
