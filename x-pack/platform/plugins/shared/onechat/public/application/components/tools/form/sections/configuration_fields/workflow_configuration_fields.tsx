/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';
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
        label={i18nMessages.configuration.form.workflow.waitForLabel}
        helpText={i18nMessages.configuration.form.workflow.waitForHelpText}
        isInvalid={!!errors.wait_for}
        error={errors.wait_for?.message}
      >
        <Controller
          name="wait_for"
          control={control}
          render={({ field }) => (
            <EuiFieldNumber
              {...field}
              onChange={(e) =>
                field.onChange(isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber)
              }
              min={1}
              step={1}
            />
          )}
        />
      </EuiFormRow>
    </>
  );
};
