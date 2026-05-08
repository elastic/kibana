/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the "Elastic License
 * 2.0".
 */

import React from 'react';
import { EuiButtonGroup, EuiFormRow, EuiSelect } from '@elastic/eui';
import { useController } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { FieldDescriptor } from '../types';

interface SelectFieldProps {
  descriptor: FieldDescriptor;
  control: Control;
}

export const SelectField = ({ descriptor, control }: SelectFieldProps) => {
  const { field } = useController({ name: descriptor.path, control });

  const rawOptions = descriptor.options ?? [];

  if (rawOptions.length <= 4) {
    return (
      <EuiFormRow label={descriptor.label} display="columnCompressed" fullWidth>
        <EuiButtonGroup
          legend={descriptor.label}
          options={rawOptions.map((opt) => ({ id: opt.value, label: opt.label }))}
          idSelected={(field.value as string) ?? ''}
          onChange={(id) => field.onChange(id)}
          buttonSize="compressed"
          isFullWidth
          data-test-subj={`schemaField-${descriptor.path}`}
        />
      </EuiFormRow>
    );
  }

  const options = rawOptions.map((opt) => ({
    value: opt.value,
    text: opt.label,
  }));

  return (
    <EuiFormRow label={descriptor.label} display="columnCompressed" fullWidth>
      <EuiSelect
        options={options}
        value={String(field.value ?? '')}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        compressed
        data-test-subj={`schemaField-${descriptor.path}`}
        fullWidth
      />
    </EuiFormRow>
  );
};
