/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { useFormContext, useController } from 'react-hook-form';
import { WorkflowPicker } from '../../components/workflow/workflow_picker';
import type { WorkflowToolFormData } from '../../types/tool_form_types';
import { i18nMessages } from '../../i18n';

export const WorkflowConfiguration = () => {
  const {
    formState: { errors },
    control,
  } = useFormContext<WorkflowToolFormData>();

  const {
    field: { value: excludeDetails, onChange: onExcludeDetailsChange },
  } = useController({
    name: 'exclude_details',
    control,
  });

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
        label={i18nMessages.configuration.form.workflow.excludeDetailsLabel}
        helpText={i18nMessages.configuration.form.workflow.excludeDetailsHelpText}
      >
        <EuiSwitch
          label={i18nMessages.configuration.form.workflow.excludeDetailsSwitchLabel}
          checked={!!excludeDetails}
          onChange={(e) => onExcludeDetailsChange(e.target.checked)}
          data-test-subj="onechatWorkflowExcludeDetailsSwitch"
        />
      </EuiFormRow>
    </>
  );
};
