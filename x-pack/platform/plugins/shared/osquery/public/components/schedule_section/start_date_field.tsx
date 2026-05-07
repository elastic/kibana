/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiDatePicker, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import type { Moment } from 'moment-timezone';
import { useController } from 'react-hook-form';

interface StartDateFieldProps {
  isDisabled?: boolean;
}

const StartDateFieldComponent: React.FC<StartDateFieldProps> = ({ isDisabled = false }) => {
  const {
    field: { value, onChange },
    fieldState: { error },
  } = useController<{ start_date: string }, 'start_date'>({
    name: 'start_date',
    defaultValue: '',
    rules: {
      required: i18n.translate('xpack.osquery.scheduleSection.startDate.requiredErrorMessage', {
        defaultMessage: 'Start date is required',
      }),
    },
  });

  const selected = useMemo<Moment | null>(() => {
    if (!value) {
      return null;
    }

    const parsed = moment(value);

    return parsed.isValid() ? parsed : null;
  }, [value]);

  const handleChange = useCallback(
    (next: Moment | null) => {
      onChange(next ? next.toISOString() : '');
    },
    [onChange]
  );

  const hasError = !!error?.message;

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.scheduleSection.startDate.label', {
        defaultMessage: 'Start date and time',
      })}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
    >
      <EuiDatePicker
        showTimeSelect
        selected={selected}
        onChange={handleChange}
        isInvalid={hasError}
        disabled={isDisabled}
        fullWidth
        data-test-subj="osquery-schedule-start-date"
      />
    </EuiFormRow>
  );
};

export const StartDateField = React.memo(StartDateFieldComponent);
