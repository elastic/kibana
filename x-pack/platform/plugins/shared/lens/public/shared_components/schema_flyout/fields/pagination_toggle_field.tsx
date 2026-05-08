/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { useController } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { FieldDescriptor } from '../types';

const DEFAULT_PAGE_SIZE = 10;

interface PaginationToggleFieldProps {
  descriptor: FieldDescriptor;
  control: Control;
}

export const PaginationToggleField = ({ descriptor, control }: PaginationToggleFieldProps) => {
  const { field } = useController({ name: descriptor.path, control });

  // Form value is a number (page size) when enabled, or undefined when disabled.
  const isEnabled = field.value != null && field.value !== false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    field.onChange(e.target.checked ? DEFAULT_PAGE_SIZE : undefined);
  };

  const switchElement = (
    <EuiSwitch
      label=""
      compressed
      checked={isEnabled}
      onChange={handleChange}
      onBlur={field.onBlur}
      data-test-subj={`schemaField-${descriptor.path}`}
    />
  );

  return (
    <EuiFormRow label={descriptor.label} display="columnCompressed" fullWidth>
      {descriptor.tooltip ? (
        <EuiToolTip content={descriptor.tooltip} position="top">
          {switchElement}
        </EuiToolTip>
      ) : (
        switchElement
      )}
    </EuiFormRow>
  );
};
