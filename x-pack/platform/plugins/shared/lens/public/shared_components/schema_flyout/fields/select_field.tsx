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
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { useController } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { FormFieldDescriptor } from '../schema_walker';

interface SelectFieldProps {
  descriptor: FormFieldDescriptor;
  control: Control;
}

export const SelectField = ({ descriptor, control }: SelectFieldProps) => {
  const { field } = useController({ name: descriptor.path, control });

  const options = (descriptor.options ?? []).map((opt) => ({
    value: opt.value,
    text: opt.label,
  }));

  return (
    <EuiFormRow label={descriptor.label} helpText={descriptor.description} fullWidth>
      <EuiSelect
        options={options}
        value={String(field.value ?? '')}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        data-test-subj={`schemaField-${descriptor.path}`}
        fullWidth
      />
    </EuiFormRow>
  );
};
