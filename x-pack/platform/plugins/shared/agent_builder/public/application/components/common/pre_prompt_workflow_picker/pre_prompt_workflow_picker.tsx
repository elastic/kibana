/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFormRow, EuiIcon, EuiText, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import { WorkflowComboBox } from '../workflow_combo_box';
import type { WorkflowOption } from '../workflow_combo_box';
import { useListWorkflows } from '../../../hooks/tools/use_list_workflows';
import { isPreExecutionWorkflowEnabled } from '../../../utils/is_pre_execution_workflow_enabled';

export interface PrePromptWorkflowPickerProps {
  workflows?: WorkflowOption[];
  value: string[];
  onChange: (workflowIds: string[]) => void;
  onBlur?: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  error?: string;
  description?: React.ReactNode;
  labelAppend?: React.ReactNode;
  hideWhenPreExecutionWorkflowDisabled?: boolean;
  'data-test-subj'?: string;
  'aria-label'?: string;
}

interface PrePromptWorkflowPickerKibanaServices {
  settings: {
    client: IUiSettingsClient;
  };
}

const TITLE = i18n.translate('xpack.agentBuilder.prePromptWorkflowPicker.title', {
  defaultMessage: 'Pre-execution workflow',
});
const DESCRIPTION = i18n.translate('xpack.agentBuilder.prePromptWorkflowPicker.description', {
  defaultMessage: 'Runs as soon as the agent is invoked, before the LLM call.',
});
const PLACEHOLDER = i18n.translate('xpack.agentBuilder.prePromptWorkflowPicker.placeholder', {
  defaultMessage: 'Select workflows',
});
const ARIA_LABEL = i18n.translate('xpack.agentBuilder.prePromptWorkflowPicker.ariaLabel', {
  defaultMessage: 'Pre-execution workflows selection',
});
const WORKFLOW_LABEL = i18n.translate('xpack.agentBuilder.prePromptWorkflowPicker.workflowLabel', {
  defaultMessage: 'Workflows',
});
const OPTIONAL = i18n.translate('xpack.agentBuilder.prePromptWorkflowPicker.optional', {
  defaultMessage: 'Optional',
});

export const PrePromptWorkflowPicker: React.FC<PrePromptWorkflowPickerProps> = ({
  workflows,
  value,
  onChange,
  onBlur,
  isLoading = false,
  isDisabled = false,
  error,
  description = DESCRIPTION,
  labelAppend,
  hideWhenPreExecutionWorkflowDisabled = false,
  'data-test-subj': dataTestSubj = 'prePromptWorkflowPicker',
  'aria-label': ariaLabel = ARIA_LABEL,
}) => {
  const {
    services: { settings },
  } = useKibana<PrePromptWorkflowPickerKibanaServices>();
  const shouldFetchWorkflows = workflows === undefined;
  const shouldRender = !hideWhenPreExecutionWorkflowDisabled
    ? true
    : isPreExecutionWorkflowEnabled(settings.client);

  const { data: loadedWorkflows = [], isLoading: isLoadingWorkflows } = useListWorkflows({
    enabled: shouldFetchWorkflows,
  });

  const workflowOptions = useMemo(() => workflows ?? loadedWorkflows, [workflows, loadedWorkflows]);
  const combinedLoading = isLoading || (shouldFetchWorkflows && isLoadingWorkflows);

  if (!shouldRender) {
    return null;
  }

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="xl"
      alignItems="flexStart"
      aria-labelledby="pre-execution-workflow-title"
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem grow={1}>
        <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiIcon type="play" aria-hidden={true} />
            <EuiTitle size="xs">
              <h2 id="pre-execution-workflow-title">{TITLE}</h2>
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
            labelAppend ?? (
              <EuiText size="xs" color="subdued">
                {OPTIONAL}
              </EuiText>
            )
          }
          isInvalid={!!error}
          error={error}
        >
          <WorkflowComboBox
            workflows={workflowOptions}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={PLACEHOLDER}
            aria-label={ariaLabel}
            isLoading={combinedLoading}
            isClearable={true}
            isDisabled={isDisabled}
            isInvalid={!!error}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
