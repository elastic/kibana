/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';

export const TagsField: React.FC = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      name="tags"
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedOptions = (field.value ?? []).map((val) => ({ label: val }));
        const options = selectedOptions;

        return (
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.ruleForm.tagsLabel', {
              defaultMessage: 'Tags',
            })}
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiComboBox
              options={options}
              selectedOptions={selectedOptions}
              onChange={(selected) => field.onChange(selected.map(({ label }) => label))}
              onCreateOption={(searchValue) => {
                field.onChange([...(field.value ?? []), searchValue]);
              }}
              isClearable={true}
              isInvalid={!!error}
            />
          </EuiFormRow>
        );
      }}
    />
  );
};
