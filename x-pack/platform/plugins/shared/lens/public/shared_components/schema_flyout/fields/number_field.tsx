/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import { useController } from 'react-hook-form';
import type { SchemaFieldProps } from '../types';

export const NumberField = ({ descriptor, control }: SchemaFieldProps) => {
  const { field } = useController({ name: descriptor.path, control });

  return (
    <EuiFormRow label={descriptor.label} display="columnCompressed" fullWidth>
      <EuiFieldNumber
        value={field.value as number | undefined}
        onChange={(e) => field.onChange(e.target.valueAsNumber)}
        onBlur={field.onBlur}
        min={descriptor.min}
        max={descriptor.max}
        data-test-subj={`schemaField-${descriptor.path}`}
        fullWidth
      />
    </EuiFormRow>
  );
};
