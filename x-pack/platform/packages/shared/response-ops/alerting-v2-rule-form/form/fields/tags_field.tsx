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
import { useRuleFormMeta } from '../contexts';

export const TagsField = () => {
  const { control } = useFormContext<FormValues>();
  const { layout } = useRuleFormMeta();

  return (
    <Controller
      name="metadata.labels"
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedOptions = (field.value ?? []).map((val) => ({ label: val }));
        const options = selectedOptions;

        return (
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.ruleForm.tagsLabel', {
              defaultMessage: 'Tags',
            })}
            labelAppend={i18n.translate('xpack.alertingV2.ruleForm.tagsOptional', {
              defaultMessage: 'optional',
            })}
            isInvalid={!!error}
            error={error?.message}
            fullWidth
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
              fullWidth
              compressed={layout === 'flyout'}
            />
          </EuiFormRow>
        );
      }}
    />
  );
};
