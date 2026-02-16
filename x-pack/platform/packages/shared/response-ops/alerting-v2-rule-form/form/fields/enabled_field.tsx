/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';

export const EnabledField: React.FC = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      name="metadata.enabled"
      control={control}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <EuiFormRow
          label={i18n.translate('xpack.alertingV2.ruleForm.enabledLabel', {
            defaultMessage: 'Enabled',
          })}
          helpText={i18n.translate('xpack.alertingV2.ruleForm.enabledHelpText', {
            defaultMessage: 'When enabled, the rule will run on the defined schedule.',
          })}
          isInvalid={!!error}
          error={error?.message}
        >
          <EuiSwitch
            label={
              value
                ? i18n.translate('xpack.alertingV2.ruleForm.enabledOnLabel', {
                    defaultMessage: 'On',
                  })
                : i18n.translate('xpack.alertingV2.ruleForm.enabledOffLabel', {
                    defaultMessage: 'Off',
                  })
            }
            checked={value ?? true}
            onChange={(e) => onChange(e.target.checked)}
          />
        </EuiFormRow>
      )}
    />
  );
};
