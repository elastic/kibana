/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { ToolConfirmationPolicyMode } from '@kbn/agent-builder-common';
import { i18nMessages } from '../i18n';
import type { ToolConfirmationFormData } from '../types/tool_form_types';

interface ConfirmationPolicySelectProps {
  id: string;
  'data-test-subj'?: string;
}

const confirmationOptions: Array<{ value: ToolConfirmationPolicyMode; text: string }> = [
  { value: 'never' as const, text: i18nMessages.configuration.form.confirmation.neverOption },
  { value: 'once' as const, text: i18nMessages.configuration.form.confirmation.onceOption },
  { value: 'always' as const, text: i18nMessages.configuration.form.confirmation.alwaysOption },
];

export const ConfirmationPolicySelect = ({
  id,
  'data-test-subj': dataTestSubj = 'agentBuilderToolConfirmationPolicySelect',
}: ConfirmationPolicySelectProps) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<ToolConfirmationFormData>();

  return (
    <EuiFormRow
      label={i18nMessages.configuration.form.confirmation.label}
      helpText={i18nMessages.configuration.form.confirmation.helpText}
      isInvalid={!!errors.confirmation_ask_user}
      error={errors.confirmation_ask_user?.message}
    >
      <Controller
        control={control}
        name="confirmation_ask_user"
        render={({ field: { ref, onChange, value, ...field } }) => (
          <EuiSelect
            id={id}
            data-test-subj={dataTestSubj}
            options={confirmationOptions}
            value={value ?? 'never'}
            onChange={(e) => onChange(e.target.value)}
            {...field}
          />
        )}
      />
    </EuiFormRow>
  );
};
