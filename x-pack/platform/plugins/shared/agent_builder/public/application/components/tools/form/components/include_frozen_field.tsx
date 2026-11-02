/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckbox, EuiFormRow } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { i18nMessages } from '../i18n';
import type { IncludeFrozenFormData } from '../types/tool_form_types';

export const IncludeFrozenField = () => {
  const {
    control,
    formState: { errors },
  } = useFormContext<IncludeFrozenFormData>();

  return (
    <EuiFormRow
      label={i18nMessages.configuration.form.dataTiers.label}
      helpText={i18nMessages.configuration.form.dataTiers.includeFrozenHelpText}
      isInvalid={!!errors.includeFrozen}
      error={errors.includeFrozen?.message}
    >
      <Controller
        control={control}
        name="includeFrozen"
        render={({ field: { ref, onChange, value, ...field } }) => (
          <EuiCheckbox
            id="agentBuilderToolIncludeFrozenCheckbox"
            data-test-subj="agentBuilderToolIncludeFrozenCheckbox"
            label={i18nMessages.configuration.form.dataTiers.includeFrozenCheckboxLabel}
            inputRef={ref}
            onChange={(e) => onChange(e.target.checked)}
            checked={value}
            {...field}
          />
        )}
      />
    </EuiFormRow>
  );
};
