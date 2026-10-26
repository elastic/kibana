/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useId } from 'react';
import { WorkflowComboBox } from '@kbn/agent-builder-browser';
import type { WorkflowComboBoxOption } from '@kbn/agent-builder-browser';
import { EuiFormRow, EuiIcon, EuiText, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface PrePromptWorkflowPickerProps {
  workflows: WorkflowComboBoxOption[];
  value: string[];
  onChange: (workflowIds: string[]) => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  description: React.ReactNode;
  'data-test-subj'?: string;
}

const TITLE = i18n.translate('xpack.genAiSettings.prePromptWorkflowPicker.title', {
  defaultMessage: 'Pre-execution workflow',
});
const PLACEHOLDER = i18n.translate('xpack.genAiSettings.prePromptWorkflowPicker.placeholder', {
  defaultMessage: 'Select workflows',
});
const ARIA_LABEL = i18n.translate('xpack.genAiSettings.prePromptWorkflowPicker.ariaLabel', {
  defaultMessage: 'Pre-execution workflows selection',
});
const WORKFLOW_LABEL = i18n.translate('xpack.genAiSettings.prePromptWorkflowPicker.workflowLabel', {
  defaultMessage: 'Workflows',
});
const OPTIONAL = i18n.translate('xpack.genAiSettings.prePromptWorkflowPicker.optional', {
  defaultMessage: 'Optional',
});

export const PrePromptWorkflowPicker: React.FC<PrePromptWorkflowPickerProps> = ({
  workflows,
  value,
  onChange,
  isLoading = false,
  isDisabled = false,
  description,
  'data-test-subj': dataTestSubj = 'genAiSettingsPrePromptWorkflowPicker',
}) => {
  const titleId = useId();

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="xl"
      alignItems="flexStart"
      aria-labelledby={titleId}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem grow={1}>
        <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiIcon type="play" aria-hidden={true} />
            <EuiTitle size="xs">
              <h2 id={titleId}>{TITLE}</h2>
            </EuiTitle>
          </EuiFlexGroup>
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <EuiFormRow
          fullWidth
          label={WORKFLOW_LABEL}
          labelAppend={
            <EuiText size="xs" color="subdued">
              {OPTIONAL}
            </EuiText>
          }
        >
          <WorkflowComboBox
            workflows={workflows}
            value={value}
            onChange={onChange}
            placeholder={PLACEHOLDER}
            aria-label={ARIA_LABEL}
            isLoading={isLoading}
            isClearable={true}
            isDisabled={isDisabled}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
