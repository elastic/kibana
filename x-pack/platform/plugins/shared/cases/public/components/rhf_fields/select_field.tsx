/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSelectProps } from '@elastic/eui';
import { EuiSelect } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FieldRow } from './field_row';
import type { BaseFieldProps } from './types';

type SelectFieldProps = BaseFieldProps & {
  euiFieldProps: Omit<EuiSelectProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'isInvalid'>;
};

export const SelectField = ({ name, euiFieldProps, ...rowProps }: SelectFieldProps) => {
  const { field, fieldState } = useController<Record<string, string | undefined>>({ name });
  const { options = [] } = euiFieldProps;

  return (
    <FieldRow fieldState={fieldState} {...rowProps}>
      <EuiSelect
        fullWidth
        data-test-subj={rowProps['data-test-subj']}
        hasNoInitialSelection={!field.value && !options.some(({ value }) => value === '')}
        {...euiFieldProps}
        inputRef={field.ref}
        name={field.name}
        value={field.value ?? ''}
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={field.onBlur}
        isInvalid={Boolean(fieldState.error)}
      />
    </FieldRow>
  );
};
SelectField.displayName = 'SelectField';
