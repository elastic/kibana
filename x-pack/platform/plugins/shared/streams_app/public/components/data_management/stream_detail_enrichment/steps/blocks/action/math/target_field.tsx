/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MathFormState } from '../../../../types';

export const MathTargetFieldSelector = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<MathFormState>();

  const { ref, ...inputProps } = register('to', {
    required: i18n.translate('xpack.streams.math.processorTargetFieldRequired', {
      defaultMessage: 'Target field is required.',
    }),
  });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.math.processorTargetFieldLabel', {
        defaultMessage: 'Target field',
      })}
      isInvalid={Boolean(errors.to)}
      error={errors.to?.message}
      fullWidth
    >
      <EuiFieldText isInvalid={Boolean(errors.to)} {...inputProps} inputRef={ref} fullWidth />
    </EuiFormRow>
  );
};
