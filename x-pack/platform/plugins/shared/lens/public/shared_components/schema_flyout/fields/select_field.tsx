/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the "Elastic License
 * 2.0".
 */

import React from 'react';
import { EuiButtonGroup, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useController } from 'react-hook-form';
import type { SchemaFieldProps } from '../types';

export const SelectField = ({ descriptor, control }: SchemaFieldProps) => {
  const { field } = useController({
    name: descriptor.path,
    control,
    defaultValue: descriptor.defaultValue,
  });

  const rawOptions = descriptor.options ?? [];

  const isOptional = !descriptor.required;

  if (rawOptions.length <= 4) {
    return (
      <EuiFormRow label={descriptor.label} display="columnCompressed" fullWidth>
        <EuiButtonGroup
          legend={descriptor.label}
          options={rawOptions.map((opt) => ({ id: opt.value, label: opt.label }))}
          idSelected={(field.value as string) ?? (descriptor.defaultValue as string) ?? ''}
          onChange={(id) => {
            if (isOptional && field.value === id) {
              field.onChange(undefined);
            } else {
              field.onChange(id);
            }
          }}
          buttonSize="compressed"
          isFullWidth
          data-test-subj={`schemaField-${descriptor.path}`}
        />
      </EuiFormRow>
    );
  }

  const options = [
    ...(isOptional
      ? [
          {
            value: '',
            text: i18n.translate('xpack.lens.schemaField.selectNone', {
              defaultMessage: 'None',
            }),
          },
        ]
      : []),
    ...rawOptions.map((opt) => ({
      value: opt.value,
      text: opt.label,
    })),
  ];

  return (
    <EuiFormRow label={descriptor.label} display="columnCompressed" fullWidth>
      <EuiSelect
        options={options}
        value={String(field.value ?? '')}
        onChange={(e) => field.onChange(e.target.value || undefined)}
        onBlur={field.onBlur}
        compressed
        data-test-subj={`schemaField-${descriptor.path}`}
        fullWidth
      />
    </EuiFormRow>
  );
};
