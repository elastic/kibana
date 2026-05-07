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
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { useController } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { FieldDescriptor } from '../types';

interface ToggleFieldProps {
  descriptor: FieldDescriptor;
  control: Control;
}

export const ToggleField = ({ descriptor, control }: ToggleFieldProps) => {
  const { field } = useController({ name: descriptor.path, control });

  return (
    <EuiFormRow
      label={descriptor.label}
      helpText={descriptor.description}
      display="columnCompressed"
      fullWidth
    >
      <EuiSwitch
        label=""
        compressed
        checked={Boolean(field.value)}
        onChange={(e) => field.onChange(e.target.checked)}
        onBlur={field.onBlur}
        data-test-subj={`schemaField-${descriptor.path}`}
      />
    </EuiFormRow>
  );
};
