/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiTextAreaProps } from '@elastic/eui';
import { EuiTextArea } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FieldRow } from './field_row';
import type { BaseFieldProps } from './types';

type TextareaFieldProps = BaseFieldProps & {
  euiFieldProps?: Omit<EuiTextAreaProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'isInvalid'>;
};

export const TextareaField = ({ name, euiFieldProps, ...rowProps }: TextareaFieldProps) => {
  const { field, fieldState } = useController<Record<string, string | undefined>>({ name });

  return (
    <FieldRow fieldState={fieldState} {...rowProps}>
      <EuiTextArea
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
TextareaField.displayName = 'TextareaField';
