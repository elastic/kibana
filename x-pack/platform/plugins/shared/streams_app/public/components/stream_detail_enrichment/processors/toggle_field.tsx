/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { EuiFormRow, EuiFormRowProps, EuiSwitch, htmlIdGenerator } from '@elastic/eui';
import { ProcessorFormState } from '../types';

type ExtractBooleanFields<TInput> = NonNullable<
  {
    [K in keyof TInput]: boolean extends TInput[K] ? K : never;
  }[keyof TInput]
>;

interface ToggleFieldProps {
  helpText?: EuiFormRowProps['helpText'];
  id?: string;
  label: string;
  name: ExtractBooleanFields<ProcessorFormState>;
}

export const ToggleField = ({
  helpText,
  id = createId(),
  label,
  name,
  ...rest
}: ToggleFieldProps) => {
  const { field } = useController<ProcessorFormState, ToggleFieldProps['name']>({
    name,
  });

  return (
    <EuiFormRow helpText={helpText} fullWidth describedByIds={id ? [id] : undefined} {...rest}>
      <EuiSwitch
        id={id}
        label={label}
        checked={field.value ?? false}
        onChange={(e) => field.onChange(e.target.checked)}
      />
    </EuiFormRow>
  );
};

const createId = htmlIdGenerator();
