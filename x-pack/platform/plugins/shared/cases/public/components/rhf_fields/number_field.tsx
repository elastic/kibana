/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiFieldNumberProps } from '@elastic/eui';
import { EuiFieldNumber } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FieldRow } from './field_row';
import type { BaseFieldProps } from './types';

type NumberFieldProps = BaseFieldProps & {
  euiFieldProps?: Omit<EuiFieldNumberProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'isInvalid'>;
};

/** Maps the empty-input value `''` to `undefined`; use it with `z.preprocess` in the field schema. */
export const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

/**
 * The form value is a `number`, or `''` while the input is empty (`undefined` would make react-hook-form
 * fall back to the default value). Wrap the schema in `z.preprocess(emptyToUndefined, ...)`.
 */
export const NumberField = ({ name, euiFieldProps, ...rowProps }: NumberFieldProps) => {
  const { field, fieldState } = useController<Record<string, number | ''>>({ name });

  return (
    <FieldRow fieldState={fieldState} {...rowProps}>
      <EuiFieldNumber
        fullWidth
        data-test-subj={rowProps['data-test-subj']}
        {...euiFieldProps}
        inputRef={field.ref}
        name={field.name}
        value={field.value ?? ''}
        onChange={({ target: { value } }) => field.onChange(value === '' ? '' : Number(value))}
        onBlur={field.onBlur}
        isInvalid={Boolean(fieldState.error)}
      />
    </FieldRow>
  );
};
NumberField.displayName = 'NumberField';
