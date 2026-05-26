/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { INTERVAL_FIELD_HELP, INTERVAL_FIELD_LABEL } from './translations';

/**
 * Minimum 1 second, maximum 604,800 seconds (7 days) — matches the existing
 * per-query IntervalField range in the pack-query flyout.
 */
export const MIN_INTERVAL_SECONDS = 1;
export const MAX_INTERVAL_SECONDS = 604800;

export interface IntervalFieldProps {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}

export const IntervalField = ({ value, onChange, disabled }: IntervalFieldProps) => {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      if (!Number.isFinite(raw)) return;

      const clamped = Math.min(
        MAX_INTERVAL_SECONDS,
        Math.max(MIN_INTERVAL_SECONDS, Math.trunc(raw))
      );
      onChange(clamped);
    },
    [onChange]
  );

  return (
    <EuiFormRow label={INTERVAL_FIELD_LABEL} helpText={INTERVAL_FIELD_HELP} fullWidth>
      <EuiFieldNumber
        min={MIN_INTERVAL_SECONDS}
        max={MAX_INTERVAL_SECONDS}
        step={1}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        data-test-subj="osquery-schedule-interval"
      />
    </EuiFormRow>
  );
};
