/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';

const KIND_OPTIONS: Array<{ id: FormValues['kind']; label: string }> = [
  {
    id: 'alert',
    label: i18n.translate('xpack.alertingV2.ruleForm.kindField.alertOption', {
      defaultMessage: 'Alert',
    }),
  },
  {
    id: 'signal',
    label: i18n.translate('xpack.alertingV2.ruleForm.kindField.monitorOption', {
      defaultMessage: 'Monitor',
    }),
  },
];

export const KindField: React.FC = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      name="kind"
      control={control}
      render={({ field: { value, onChange, ref }, fieldState: { error } }) => (
        <EuiFormRow
          label={i18n.translate('xpack.alertingV2.ruleForm.kindLabel', {
            defaultMessage: 'Rule kind',
          })}
          helpText={i18n.translate('xpack.alertingV2.ruleForm.kindHelpText', {
            defaultMessage: 'Choose whether this rule creates monitors or alerts.',
          })}
          fullWidth
          isInvalid={!!error}
          error={error?.message}
        >
          <div ref={ref}>
            <EuiButtonGroup
              legend={i18n.translate('xpack.alertingV2.ruleForm.kindField.legend', {
                defaultMessage: 'Rule kind',
              })}
              options={KIND_OPTIONS}
              idSelected={value}
              onChange={(id) => onChange(id)}
              buttonSize="compressed"
              color="primary"
              isFullWidth
              data-test-subj="kindField"
            />
          </div>
        </EuiFormRow>
      )}
    />
  );
};
