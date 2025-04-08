/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldConfiguration } from '../types';

export const TextField = ({ fieldConfiguration }: { fieldConfiguration: FieldConfiguration }) => {
  const { field, label, helpText, required } = fieldConfiguration;
  const { register } = useFormContext();
  const { ref, ...inputProps } = register(field, { required });

  return (
    <EuiFormRow label={label} helpText={helpText} fullWidth>
      <EuiFieldText {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};
