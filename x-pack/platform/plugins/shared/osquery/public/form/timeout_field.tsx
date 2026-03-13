/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';
import { useController } from 'react-hook-form';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { QUERY_TIMEOUT } from '../../common/constants';

interface TimeoutFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const TimeoutFieldComponent = ({ euiFieldProps }: TimeoutFieldProps) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'timeout',
    defaultValue: QUERY_TIMEOUT.DEFAULT,
    rules: {
      validate: (currentValue: number) => {
        if (currentValue < QUERY_TIMEOUT.DEFAULT || isNaN(currentValue)) {
          return i18n.translate('xpack.osquery.pack.queryFlyoutForm.timeoutFieldMinNumberError', {
            defaultMessage: 'The timeout value must be {timeoutInSeconds} seconds or higher.',
            values: { timeoutInSeconds: QUERY_TIMEOUT.DEFAULT },
          });
        }

        if (currentValue > QUERY_TIMEOUT.MAX) {
          return i18n.translate('xpack.osquery.pack.queryFlyoutForm.timeoutFieldMaxNumberError', {
            defaultMessage: 'The timeout value must be {timeoutInSeconds} seconds or or lower. ',
            values: { timeoutInSeconds: QUERY_TIMEOUT.MAX },
          });
        }
      },
    },
  });
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numberValue = parseInt(e.target.value, 10);
      onChange(numberValue);
    },
    [onChange]
  );
  const hasError = useMemo(() => !!error?.message, [error?.message]);
  const { isDisabled, ...restEuiFieldProps } = euiFieldProps ?? {};

  return (
    <EuiFormRow
      label={
        <EuiFlexGroup gutterSize="xs" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <FormattedMessage id="xpack.osquery.liveQuery.timeout" defaultMessage="Timeout" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate('xpack.osquery.liveQuery.timeoutHint', {
                defaultMessage:
                  'The default and minimum timeout period is 60 seconds. Increase this value if your query needs more time to run.',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      fullWidth
      error={error?.message}
      isInvalid={hasError}
    >
      <EuiFieldNumber
        isInvalid={hasError}
        value={value}
        onChange={handleChange}
        fullWidth
        type="number"
        data-test-subj="timeout-input"
        name="timeout"
        min={QUERY_TIMEOUT.DEFAULT}
        max={QUERY_TIMEOUT.MAX}
        step={1}
        append="seconds"
        disabled={!!isDisabled}
        {...restEuiFieldProps}
      />
    </EuiFormRow>
  );
};

export const TimeoutField = React.memo(TimeoutFieldComponent, deepEqual);
