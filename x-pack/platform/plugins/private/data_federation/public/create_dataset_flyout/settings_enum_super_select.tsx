/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import type { Control, FieldPath, RegisterOptions } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';
import { buildSuperSelectOption } from './dataset_settings_super_select_utils';

export interface SettingsEnumSuperSelectProps<T extends string> {
  control: Control<CreateDatasetFormValues>;
  name: FieldPath<CreateDatasetFormValues>;
  label: string;
  helpText?: string;
  placeholder: string;
  options: Array<{ value: T; label: string; description?: string }>;
  'data-test-subj': string;
  rules?: RegisterOptions<CreateDatasetFormValues, FieldPath<CreateDatasetFormValues>>;
}

export function SettingsEnumSuperSelect<T extends string>({
  control,
  name,
  label,
  helpText,
  placeholder,
  options,
  'data-test-subj': dataTestSubj,
  rules,
}: SettingsEnumSuperSelectProps<T>): ReturnType<FunctionComponent> {
  const { field, fieldState } = useController({ name, control, rules });

  const superSelectOptions = useMemo(
    () => options.map((option) => buildSuperSelectOption(option)),
    [options]
  );

  const hasValue = Boolean(field.value);

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      fullWidth
      isInvalid={Boolean(fieldState.error)}
      error={fieldState.error?.message}
    >
      <EuiSuperSelect
        options={superSelectOptions}
        data-test-subj={dataTestSubj}
        fullWidth
        compressed
        aria-label={label}
        placeholder={placeholder}
        valueOfSelected={hasValue ? (field.value as T) : undefined}
        onChange={(value) => field.onChange(value)}
        name={field.name}
        buttonRef={field.ref}
        isInvalid={Boolean(fieldState.error)}
      />
    </EuiFormRow>
  );
}
