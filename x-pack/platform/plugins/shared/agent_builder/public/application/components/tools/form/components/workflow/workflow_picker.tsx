/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { WorkflowComboBox } from '@kbn/agent-builder-browser';
import type { WorkflowComboBoxOption } from '@kbn/agent-builder-browser';
import { i18n } from '@kbn/i18n';
import { useController, useFormContext } from 'react-hook-form';
import { useListWorkflows } from '../../../../../hooks/tools/use_list_workflows';

export interface WorkflowPickerProps {
  name: string;
  /** Single workflow (string) vs multiple (string[]). Default true. */
  singleSelection?: boolean;
  isDisabled?: boolean;
}

interface WorkflowPickerVariantProps {
  name: string;
  isDisabled: boolean;
  workflows: WorkflowComboBoxOption[];
  isLoading: boolean;
}

const SingleWorkflowPicker: React.FC<WorkflowPickerVariantProps> = ({
  name,
  isDisabled,
  workflows,
  isLoading,
}) => {
  const { control, trigger } = useFormContext<Record<string, string | undefined>>();
  const {
    field: { value, onChange, onBlur },
    fieldState,
  } = useController({
    name,
    control,
  });
  const handleSelectionChange = async (workflowIds: string[]) => {
    onChange(workflowIds[0] ?? '');
    await trigger(name);
  };

  return (
    <WorkflowComboBox
      workflows={workflows ?? []}
      value={value ? [value] : []}
      onChange={handleSelectionChange}
      onBlur={onBlur}
      placeholder={i18n.translate('xpack.agentBuilder.tools.workflow.picker.placeholder', {
        defaultMessage: 'Select a workflow',
      })}
      aria-label={i18n.translate('xpack.agentBuilder.tools.workflow.picker.ariaLabel', {
        defaultMessage: 'Workflow selection',
      })}
      singleSelection={true}
      isLoading={isLoading}
      isInvalid={fieldState.invalid}
      isClearable={false}
      isDisabled={isDisabled}
    />
  );
};

const MultiWorkflowPicker: React.FC<WorkflowPickerVariantProps> = ({
  name,
  isDisabled,
  workflows,
  isLoading,
}) => {
  const { control, trigger } = useFormContext<Record<string, string[] | undefined>>();
  const {
    field: { value = [], onChange, onBlur },
    fieldState,
  } = useController({
    name,
    control,
  });
  const handleSelectionChange = async (workflowIds: string[]) => {
    onChange(workflowIds);
    await trigger(name);
  };

  return (
    <WorkflowComboBox
      workflows={workflows ?? []}
      value={value}
      onChange={handleSelectionChange}
      onBlur={onBlur}
      placeholder={i18n.translate('xpack.agentBuilder.agents.form.settings.workflowPlaceholder', {
        defaultMessage: 'Select workflows',
      })}
      aria-label={i18n.translate('xpack.agentBuilder.agents.form.settings.workflowAriaLabel', {
        defaultMessage: 'Pre-execution workflows selection',
      })}
      singleSelection={false}
      isLoading={isLoading}
      isInvalid={fieldState.invalid}
      isClearable={true}
      isDisabled={isDisabled}
    />
  );
};

export const WorkflowPicker: React.FC<WorkflowPickerProps> = ({
  name,
  singleSelection = true,
  isDisabled = false,
}) => {
  const { data: workflows, isLoading } = useListWorkflows();
  const workflowOptions = workflows ?? [];

  if (singleSelection) {
    return (
      <SingleWorkflowPicker
        name={name}
        isDisabled={isDisabled}
        workflows={workflowOptions}
        isLoading={isLoading}
      />
    );
  }

  return (
    <MultiWorkflowPicker
      name={name}
      isDisabled={isDisabled}
      workflows={workflowOptions}
      isLoading={isLoading}
    />
  );
};
