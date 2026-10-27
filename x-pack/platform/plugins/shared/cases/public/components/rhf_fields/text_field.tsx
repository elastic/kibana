/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiFieldTextProps } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FieldRow } from './field_row';
import type { BaseFieldProps } from './types';

type TextFieldProps = BaseFieldProps & {
  euiFieldProps?: Omit<EuiFieldTextProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'isInvalid'>;
};

export const TextField = ({ name, euiFieldProps, ...rowProps }: TextFieldProps) => {
  const { field, fieldState } = useController<Record<string, string | undefined>>({ name });

  return (
    <FieldRow fieldState={fieldState} {...rowProps}>
      <EuiFieldText
        fullWidth
        data-test-subj={rowProps['data-test-subj']}
        {...euiFieldProps}
        inputRef={field.ref}
        name={field.name}
        value={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        isInvalid={Boolean(fieldState.error)}
      />
    </FieldRow>
  );
};
TextField.displayName = 'TextField';
