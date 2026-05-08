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
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { useController } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { FieldDescriptor } from '../types';

interface TextFieldProps {
  descriptor: FieldDescriptor;
  control: Control;
}

export const TextField = ({ descriptor, control }: TextFieldProps) => {
  const { field } = useController({ name: descriptor.path, control });

  return (
    <EuiFormRow label={descriptor.label} display="columnCompressed" fullWidth>
      <EuiFieldText
        value={String(field.value ?? '')}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        data-test-subj={`schemaField-${descriptor.path}`}
        fullWidth
      />
    </EuiFormRow>
  );
};
