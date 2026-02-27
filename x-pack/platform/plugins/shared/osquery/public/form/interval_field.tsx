/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';
import { useController } from 'react-hook-form';
import type { EuiFieldNumberProps } from '@elastic/eui';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const intervalFieldValidations = {
  required: {
    message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.intervalFieldMinNumberError', {
      defaultMessage: 'A positive interval value is required',
    }),
    value: true,
  },
  min: {
    message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.intervalFieldMinNumberError', {
      defaultMessage: 'A positive interval value is required',
    }),
    value: 1,
  },
  max: {
    message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.intervalFieldMaxNumberError', {
      defaultMessage: 'An interval value must be lower than {than}',
      values: { than: 604800 },
    }),
    value: 604800,
  },
};

interface IntervalFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const IntervalFieldComponent = ({ euiFieldProps }: IntervalFieldProps) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'interval',
    defaultValue: 3600,
    rules: {
      ...intervalFieldValidations,
    },
  });
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numberValue = e.target.valueAsNumber ? e.target.valueAsNumber : 0;
      onChange(numberValue);
    },
    [onChange]
  );
  const hasError = useMemo(() => !!error?.message, [error?.message]);
  const { isDisabled, ...restEuiFieldProps } = euiFieldProps ?? {};

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.pack.queryFlyoutForm.intervalFieldLabel', {
        defaultMessage: 'Interval (s)',
      })}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
    >
      <EuiFieldNumber
        isInvalid={hasError}
        value={value as EuiFieldNumberProps['value']}
        onChange={handleChange}
        fullWidth
        type="number"
        data-test-subj="osquery-interval-field"
        disabled={!!isDisabled}
        {...restEuiFieldProps}
      />
    </EuiFormRow>
  );
};

export const IntervalField = React.memo(IntervalFieldComponent, deepEqual);
