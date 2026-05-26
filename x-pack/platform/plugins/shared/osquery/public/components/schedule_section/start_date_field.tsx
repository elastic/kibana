/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import moment from 'moment';
import { EuiDatePicker, EuiFormRow } from '@elastic/eui';
import { START_DATE_LABEL } from './translations';

export interface StartDateFieldProps {
  value: Date;
  onChange: (next: Date) => void;
  disabled?: boolean;
}

export const StartDateField = ({ value, onChange, disabled }: StartDateFieldProps) => {
  const handleChange = useCallback(
    (next: moment.Moment | null) => {
      if (!next) return;
      onChange(next.toDate());
    },
    [onChange]
  );

  const selectedMoment = useMemo(() => moment(value), [value]);

  return (
    <EuiFormRow label={START_DATE_LABEL} fullWidth>
      <EuiDatePicker
        fullWidth
        selected={selectedMoment}
        onChange={handleChange}
        showTimeSelect
        disabled={disabled}
        data-test-subj="osquery-schedule-start-date"
      />
    </EuiFormRow>
  );
};
