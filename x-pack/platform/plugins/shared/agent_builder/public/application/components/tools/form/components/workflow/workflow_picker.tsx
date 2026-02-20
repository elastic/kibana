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

export interface WorkflowPickerProps {
  /** Form field name (e.g. 'workflow_id' or 'configuration.workflow_ids') */
  name: string;
  /** Single workflow (string) vs multiple (string[]). Default true. */
  singleSelection?: boolean;
  isDisabled?: boolean;
}

export const WorkflowPicker: React.FC<WorkflowPickerProps> = ({
  name,
  singleSelection = true,
  isDisabled = false,
}) => {
  const { control, trigger } = useFormContext();
  const {
    field: { value, onChange, onBlur },
    fieldState,
  } = useController({
    name,
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
    if (singleSelection) {
      const id = value as string | undefined;
      if (!id) return [];
      const selectedWorkflow = workflows?.find((w) => w.id === id);
      if (!selectedWorkflow) return [];
      return [
        { key: selectedWorkflow.id, label: selectedWorkflow.name, value: selectedWorkflow.id },
      ];
    }
    const ids = Array.isArray(value) ? value : [];
    return ids
      .map((id) => workflows?.find((w) => w.id === id))
      .filter(Boolean)
      .map((w) => ({ key: w!.id, label: w!.name, value: w!.id }));
  }, [value, workflows, singleSelection]);

  const handleSelectionChange = async (
    newSelectedOptions: Array<EuiComboBoxOptionOption<string>>
  ) => {
    if (singleSelection) {
      const selectedWorkflowId = newSelectedOptions.length > 0 ? newSelectedOptions[0].value : '';
      onChange(selectedWorkflowId);
    } else {
      onChange(newSelectedOptions.map((o) => o.value ?? '').filter(Boolean));
    }
    await trigger(name);
  };

  const placeholder = singleSelection
    ? i18n.translate('xpack.agentBuilder.tools.workflow.picker.placeholder', {
        defaultMessage: 'Select a workflow',
      })
    : i18n.translate('xpack.agentBuilder.agents.form.settings.workflowPlaceholder', {
        defaultMessage: 'Select workflows',
      });

  const ariaLabel = singleSelection
    ? i18n.translate('xpack.agentBuilder.tools.workflow.picker.ariaLabel', {
        defaultMessage: 'Workflow selection',
      })
    : i18n.translate('xpack.agentBuilder.agents.form.settings.workflowAriaLabel', {
        defaultMessage: 'Pre-execution workflows selection',
      });

  return (
    <EuiComboBox
      placeholder={placeholder}
      options={options}
      fullWidth
      selectedOptions={selectedOptions}
      onChange={handleSelectionChange}
      onBlur={onBlur}
      singleSelection={singleSelection ? { asPlainText: false } : undefined}
      isLoading={isLoading}
      isInvalid={fieldState.invalid}
      isClearable={!singleSelection}
      isDisabled={isDisabled}
      data-test-subj={'agentBuilderWorkflowPicker'}
      aria-label={ariaLabel}
    />
  );
};
