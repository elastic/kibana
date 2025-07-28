/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useCallback, useEffect, useState } from 'react';
import * as i18n from './translations';
import type { WorkflowsActionParams } from './types';

interface WorkflowOption {
  value: string;
  inputDisplay: string;
  dropdownDisplay: React.ReactNode;
}

const WorkflowsParamsFields: React.FunctionComponent<ActionParamsProps<WorkflowsActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { workflowId, inputs } = actionParams.subActionParams ?? {};
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { http } = useKibana().services;

  const editSubActionParams = useCallback(
    (key: string, value: any) => {
      const newParams = {
        ...actionParams,
        subAction: 'run',
        subActionParams: {
          ...actionParams.subActionParams,
          [key]: value,
        },
      };
      editAction('subAction', 'run', index);
      editAction('subActionParams', newParams.subActionParams, index);
    },
    [actionParams, editAction, index]
  );

  const onWorkflowIdChange = useCallback(
    (value: string) => {
      editSubActionParams('workflowId', value);
    },
    [editSubActionParams]
  );

  const onInputsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      try {
        const parsedInputs = e.target.value ? JSON.parse(e.target.value) : {};
        editSubActionParams('inputs', parsedInputs);
      } catch (error) {
        // Keep the raw value if JSON is invalid
        editSubActionParams('inputs', e.target.value);
      }
    },
    [editSubActionParams]
  );

  // Fetch workflows from internal Kibana API
  useEffect(() => {
    const fetchWorkflows = async () => {
      if (!http) {
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await http.get('/api/workflows/list');
        const workflowsMap = response as Record<string, string>;

        const workflowOptions: WorkflowOption[] = Object.entries(workflowsMap).map(
          ([id, name]) => ({
            value: id,
            inputDisplay: `${name} (${id})`,
            dropdownDisplay: (
              <div>
                <strong>{name}</strong>
                <br />
                <EuiText size="s" color="subdued">
                  ID: {id}
                </EuiText>
              </div>
            ),
          })
        );

        setWorkflows(workflowOptions);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch workflows:', error);
        setLoadError(i18n.FAILED_TO_LOAD_WORKFLOWS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflows();
  }, [http]);

  const workflowOptions =
    workflows.length > 0
      ? workflows
      : [
          {
            value: '',
            inputDisplay: i18n.NO_WORKFLOWS_AVAILABLE,
            dropdownDisplay: i18n.NO_WORKFLOWS_AVAILABLE,
          },
        ];

  const errorMessages = errors['subActionParams.workflowId'];
  const errorMessage = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
  const displayError = typeof errorMessage === 'string' ? errorMessage : undefined;
  const helpText = loadError || (isLoading ? i18n.LOADING_WORKFLOWS : undefined);

  return (
    <>
      <EuiFormRow
        id="workflowId"
        fullWidth
        error={displayError}
        isInvalid={displayError !== undefined}
        label={i18n.WORKFLOW_ID_LABEL}
        helpText={helpText}
      >
        {isLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          <EuiSuperSelect
            fullWidth
            options={workflowOptions}
            valueOfSelected={workflowId || ''}
            onChange={onWorkflowIdChange}
            data-test-subj="workflowIdSelect"
            placeholder={i18n.SELECT_WORKFLOW_PLACEHOLDER}
            isInvalid={displayError !== undefined}
            disabled={workflows.length === 0}
          />
        )}
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow id="inputs" fullWidth label={i18n.INPUTS_LABEL} helpText={i18n.INPUTS_HELP_TEXT}>
        <EuiTextArea
          fullWidth
          value={inputs ? JSON.stringify(inputs, null, 2) : '{}'}
          onChange={onInputsChange}
          data-test-subj="workflowInputsEditor"
          rows={6}
          placeholder='{"key": "value"}'
        />
      </EuiFormRow>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default WorkflowsParamsFields;
