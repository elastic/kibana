/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';

const NAME_ROW_ID = 'ruleV2FormNameField';

export const NameField: React.FC = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      name="metadata.name"
      control={control}
      rules={{
        required: i18n.translate('xpack.alertingV2.ruleForm.nameRequiredError', {
          defaultMessage: 'Name is required.',
        }),
      }}
      render={({ field: { ref, ...field }, fieldState: { error } }) => (
        <EuiFormRow
          id={NAME_ROW_ID}
          label={i18n.translate('xpack.alertingV2.ruleForm.nameLabel', {
            defaultMessage: 'Name',
          })}
          isInvalid={!!error}
          error={error?.message}
        >
          <EuiFieldText {...field} inputRef={ref} isInvalid={!!error} />
        </EuiFormRow>
      )}
    />
  );
};
