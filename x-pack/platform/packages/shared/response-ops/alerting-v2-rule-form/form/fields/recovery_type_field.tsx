/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { RecoveryPolicyType } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';

const RECOVERY_TYPE_OPTIONS: Array<{ value: RecoveryPolicyType; text: string }> = [
  {
    value: 'no_breach',
    text: i18n.translate('xpack.alertingV2.ruleForm.recoveryType.noBreach', {
      defaultMessage: 'Alert condition is no longer met',
    }),
  },
  {
    value: 'query',
    text: i18n.translate('xpack.alertingV2.ruleForm.recoveryType.query', {
      defaultMessage: 'Recovery condition is met [ES|QL query]',
    }),
  },
];

/**
 * Dropdown field for selecting the recovery policy type.
 *
 * Options:
 * - `no_breach`: Alert recovers when the evaluation condition is no longer breached
 * - `query`: Alert recovers when a custom ES|QL recovery query matches
 */
export const RecoveryTypeField = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      control={control}
      name="recoveryPolicy.type"
      render={({ field, fieldState }) => (
        <EuiFormRow
          label={i18n.translate('xpack.alertingV2.ruleForm.recoveryTypeLabel', {
            defaultMessage: 'Recovery',
          })}
          isInvalid={!!fieldState.error}
          error={fieldState.error?.message}
          fullWidth
        >
          <EuiSelect
            isInvalid={!!fieldState.error}
            options={RECOVERY_TYPE_OPTIONS}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            fullWidth
            data-test-subj="recoveryTypeSelect"
          />
        </EuiFormRow>
      )}
    />
  );
};
