/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFormRow, EuiRange } from '@elastic/eui';
import { useController } from 'react-hook-form';
import type { SchemaFieldProps } from '../types';

const DEBOUNCE_MS = 256;

export const RangeField = ({ descriptor, control }: SchemaFieldProps) => {
  const { field } = useController({ name: descriptor.path, control });

  const min = (descriptor.props?.min as number) ?? descriptor.min ?? 0;
  const max = (descriptor.props?.max as number) ?? descriptor.max ?? 100;
  const step = (descriptor.props?.step as number) ?? 0.1;

  const [localValue, setLocalValue] = useState<number>(
    (field.value as number) ?? (descriptor.defaultValue as number) ?? min
  );

  // Sync from form → local when external changes arrive
  useEffect(() => {
    if (field.value !== undefined && field.value !== localValue) {
      setLocalValue(field.value as number);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.value]);

  // Debounced commit to react-hook-form
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== field.value) {
        field.onChange(localValue);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue]);

  const handleChange = useCallback(
    (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.MouseEvent<HTMLButtonElement>
        | React.KeyboardEvent<HTMLInputElement>
    ) => {
      setLocalValue(Number((e.target as HTMLInputElement).value));
    },
    []
  );

  return (
    <EuiFormRow label={descriptor.label} display="columnCompressed" fullWidth>
      <EuiRange
        value={localValue}
        min={min}
        max={max}
        step={step}
        showInput
        compressed
        fullWidth
        onChange={handleChange}
        data-test-subj={`schemaField-${descriptor.path}`}
      />
    </EuiFormRow>
  );
};
