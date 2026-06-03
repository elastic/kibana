/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCheckbox } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';

const ENABLED_CHECKBOX_ID = 'ruleFormEnabledCheckbox';

export const EnabledField = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      name="metadata.enabled"
      control={control}
      render={({ field: { value, onChange } }) => (
        <EuiCheckbox
          id={ENABLED_CHECKBOX_ID}
          label={i18n.translate('xpack.alertingV2.ruleForm.enabledCheckboxLabel', {
            defaultMessage: 'Enable rule on save',
          })}
          checked={value ?? true}
          onChange={(e) => onChange(e.target.checked)}
          data-test-subj="ruleFormEnabledCheckbox"
        />
      )}
    />
  );
};
