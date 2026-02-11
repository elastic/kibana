/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiCheckbox } from '@elastic/eui';
import { useFormContext, Controller } from 'react-hook-form';
import { WorkflowPicker } from '../../components/workflow/workflow_picker';
import type { WorkflowToolFormData } from '../../types/tool_form_types';
import { i18nMessages } from '../../i18n';

export const WorkflowConfiguration = () => {
  const {
    control,
    formState: { errors },
  } = useFormContext<WorkflowToolFormData>();

  return (
    <>
      <EuiFormRow
        label={i18nMessages.configuration.form.workflow.workflowLabel}
        isInvalid={!!errors.workflow_id}
        error={errors.workflow_id?.message}
      >
        <WorkflowPicker />
      </EuiFormRow>
      <EuiFormRow
        label={i18nMessages.configuration.form.workflow.waitForCompletionLabel}
        helpText={i18nMessages.configuration.form.workflow.waitForCompletionHelpText}
        isInvalid={!!errors.wait_for_completion}
        error={errors.wait_for_completion?.message}
      >
        <Controller
          control={control}
          name="wait_for_completion"
          render={({ field: { ref, onChange, value, ...field } }) => (
            <EuiCheckbox
              id="agentBuilderWorkflowToolWaitForCompletionCheckbox"
              label={i18nMessages.configuration.form.workflow.waitForCompletionCheckboxLabel}
              inputRef={ref}
              onChange={(e) => {
                onChange(e.target.checked);
              }}
              checked={value}
              {...field}
            />
          )}
        />
      </EuiFormRow>
    </>
  );
};
