/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSwitch, htmlIdGenerator } from '@elastic/eui';
import React from 'react';
import { useController } from 'react-hook-form';
import { FieldConfiguration } from '../types';

export const BooleanField = ({
  fieldConfiguration,
  id = createId(),
}: {
  fieldConfiguration: FieldConfiguration;
  id?: string;
}) => {
  const { helpText, label, field: fieldName } = fieldConfiguration;

  const { field } = useController({
    name: fieldName,
  });

  return (
    <EuiFormRow label={label} helpText={helpText} fullWidth describedByIds={id ? [id] : undefined}>
      <EuiSwitch
        id={id}
        label={label}
        checked={(field.value as boolean) ?? false}
        onChange={(e) => field.onChange(e.target.checked)}
      />
    </EuiFormRow>
  );
};

const createId = htmlIdGenerator();
