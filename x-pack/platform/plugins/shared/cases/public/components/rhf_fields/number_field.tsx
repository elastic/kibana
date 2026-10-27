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

/** The form value is a `number`, or `undefined` while the input is empty. */
export const NumberField = ({ name, euiFieldProps, ...rowProps }: NumberFieldProps) => {
  const { field, fieldState } = useController<Record<string, number | undefined>>({ name });

  return (
    <FieldRow fieldState={fieldState} {...rowProps}>
      <EuiFieldNumber
        fullWidth
        data-test-subj={rowProps['data-test-subj']}
        {...euiFieldProps}
        inputRef={field.ref}
        name={field.name}
        value={field.value ?? ''}
        onChange={({ target: { value } }) =>
          field.onChange(value === '' ? undefined : Number(value))
        }
        onBlur={field.onBlur}
        isInvalid={Boolean(fieldState.error)}
      />
    </FieldRow>
  );
};
NumberField.displayName = 'NumberField';
