/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FieldRow } from './field_row';
import type { BaseFieldProps } from './types';

type ToggleFieldProps = Omit<BaseFieldProps, 'label'> & {
  /** Rendered next to the switch, not above it. */
  label: EuiSwitchProps['label'];
  euiFieldProps?: Omit<EuiSwitchProps, 'label' | 'name' | 'checked' | 'onChange' | 'onBlur'>;
};

export const ToggleField = ({ name, label, euiFieldProps, ...rowProps }: ToggleFieldProps) => {
  const { field, fieldState } = useController<Record<string, boolean | undefined>>({ name });

  return (
    <FieldRow fieldState={fieldState} {...rowProps}>
      <EuiSwitch
        data-test-subj={rowProps['data-test-subj']}
        {...euiFieldProps}
        label={label}
        name={field.name}
        checked={field.value ?? false}
        onChange={(event) => field.onChange(event.target.checked)}
        onBlur={field.onBlur}
      />
    </FieldRow>
  );
};
ToggleField.displayName = 'ToggleField';
