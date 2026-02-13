/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useController, useFormContext } from 'react-hook-form';
import { useListWorkflows } from '../../../../../hooks/tools/use_list_workflows';
import type { WorkflowToolFormData } from '../../types/tool_form_types';

export const WorkflowPicker: React.FC = () => {
  const { control, trigger } = useFormContext<WorkflowToolFormData>();
  const {
    field: { value, onChange, onBlur, name },
    fieldState,
  } = useController({
    name: 'workflow_id',
    control,
  });

  const { data: workflows, isLoading } = useListWorkflows();

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    return (workflows || []).map((workflow) => ({
      key: workflow.id,
      label: workflow.name,
      value: workflow.id,
    }));
  }, [workflows]);

  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    if (!value) return [];
    const selectedWorkflow = workflows?.find((w) => w.id === value);
    if (!selectedWorkflow) return [];
    return [
      {
        key: selectedWorkflow.id,
        label: selectedWorkflow.name,
        value: selectedWorkflow.id,
      },
    ];
  }, [value, workflows]);

  const handleSelectionChange = async (
    newSelectedOptions: Array<EuiComboBoxOptionOption<string>>
  ) => {
    const selectedWorkflowId = newSelectedOptions.length > 0 ? newSelectedOptions[0].value : '';
    onChange(selectedWorkflowId);
    await trigger(name);
  };

  return (
    <EuiComboBox
      placeholder={i18n.translate('xpack.agentBuilder.tools.workflow.picker.placeholder', {
        defaultMessage: 'Select a workflow',
      })}
      options={options}
      fullWidth={true}
      selectedOptions={selectedOptions}
      onChange={handleSelectionChange}
      onBlur={onBlur}
      singleSelection={{ asPlainText: false }}
      isLoading={isLoading}
      isInvalid={fieldState.invalid}
      data-test-subj="agentBuilderWorkflowPicker"
      aria-label={i18n.translate('xpack.agentBuilder.tools.workflow.picker.ariaLabel', {
        defaultMessage: 'Workflow selection',
      })}
    />
  );
};
