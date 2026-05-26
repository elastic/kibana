/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import moment from 'moment';
import { EuiDatePicker, EuiFormRow } from '@elastic/eui';
import { ToggleableRow } from './toggleable_row';
import {
  STOP_AFTER_BEFORE_START_ERROR,
  STOP_AFTER_DATE_LABEL,
  STOP_AFTER_DESCRIPTION,
  STOP_AFTER_LABEL,
} from './translations';

export interface StopAfterFieldProps {
  enabled: boolean;
  value: Date;
  startDate: Date;
  onChange: (next: { enabled: boolean; date: Date }) => void;
  disabled?: boolean;
}

export const StopAfterField = ({
  enabled,
  value,
  startDate,
  onChange,
  disabled,
}: StopAfterFieldProps) => {
  const handleToggle = useCallback(
    (next: boolean) => {
      onChange({ enabled: next, date: value });
    },
    [onChange, value]
  );

  const handleDateChange = useCallback(
    (next: moment.Moment | null) => {
      if (!next) return;
      onChange({ enabled, date: next.toDate() });
    },
    [enabled, onChange]
  );

  const selectedMoment = useMemo(() => moment(value), [value]);
  const minMoment = useMemo(() => moment(startDate), [startDate]);
  const isBeforeStart = enabled && value.getTime() <= startDate.getTime();

  return (
    <ToggleableRow
      title={STOP_AFTER_LABEL}
      description={STOP_AFTER_DESCRIPTION}
      enabled={enabled}
      onToggle={handleToggle}
      disabled={disabled}
      dataTestSubj="osquery-schedule-stop-after-toggle"
    >
      <EuiFormRow
        isInvalid={isBeforeStart}
        error={isBeforeStart ? STOP_AFTER_BEFORE_START_ERROR : undefined}
        fullWidth
      >
        <EuiDatePicker
          fullWidth
          aria-label={STOP_AFTER_DATE_LABEL}
          selected={selectedMoment}
          onChange={handleDateChange}
          showTimeSelect
          minDate={minMoment}
          disabled={disabled}
          data-test-subj="osquery-schedule-stop-after-date"
        />
      </EuiFormRow>
    </ToggleableRow>
  );
};
