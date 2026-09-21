/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { useController } from 'react-hook-form';
import type { EuiFormRowProps } from '@elastic/eui';
import { EuiFormRow, EuiSwitch, htmlIdGenerator } from '@elastic/eui';
import type { ExtractBooleanFields, ProcessorFormState } from '../../../types';

interface ToggleFieldProps {
  helpText?: EuiFormRowProps['helpText'];
  id?: string;
  label: ReactNode;
  name: ExtractBooleanFields<ProcessorFormState>;
}

type ToggleFieldFormState = Record<string, boolean | undefined>;

export const ToggleField = ({
  helpText,
  id = createId(),
  label,
  name,
  ...rest
}: ToggleFieldProps) => {
  const { field } = useController<ToggleFieldFormState>({
    name,
  });

  return (
    <EuiFormRow helpText={helpText} fullWidth describedByIds={id ? [id] : undefined} {...rest}>
      <EuiSwitch
        id={id}
        label={label}
        checked={typeof field.value === 'boolean' ? field.value : false}
        onChange={(e) => field.onChange(e.target.checked)}
        compressed
      />
    </EuiFormRow>
  );
};

const createId = htmlIdGenerator();
