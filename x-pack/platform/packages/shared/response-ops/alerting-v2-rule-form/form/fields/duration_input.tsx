/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFlexItem, EuiFormRow, EuiFlexGroup, EuiSelect } from '@elastic/eui';
import { getDurationUnitValue, getDurationNumberInItsUnit, getTimeOptions } from '../utils';
import { NumberInput } from './number_input';

export interface DurationInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fallback duration string used when `value` is empty */
  fallback?: string;
  errors?: string;
  numberLabel?: string;
  unitAriaLabel: string;
  dataTestSubj: string;
  idPrefix: string;
}

/**
 * A reusable duration input consisting of a number field and a time-unit select.
 *
 * Delegates number-input state management to `NumberInput`, which lets the user
 * freely clear and retype. The form value is only updated when the input
 * contains a valid positive integer. On blur, an empty or invalid value is
 * restored to the last valid form value.
 */
export const DurationInput = React.forwardRef<HTMLInputElement, DurationInputProps>(
  (
    { value, onChange, fallback, errors, numberLabel, unitAriaLabel, dataTestSubj, idPrefix },
    ref
  ) => {
    const effectiveValue = value || fallback || '1m';

    const intervalNumber = useMemo(() => {
      return getDurationNumberInItsUnit(effectiveValue);
    }, [effectiveValue]);

    const intervalUnit = useMemo(() => {
      return getDurationUnitValue(effectiveValue);
    }, [effectiveValue]);

    const onNumberChange = useCallback(
      (num: number) => {
        onChange(`${num}${intervalUnit}`);
      },
      [intervalUnit, onChange]
    );

    const onIntervalUnitChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(`${intervalNumber}${e.target.value}`);
      },
      [intervalNumber, onChange]
    );

    return (
      <EuiFormRow
        fullWidth
        data-test-subj={dataTestSubj}
        display="rowCompressed"
        isInvalid={!!errors}
        error={errors}
      >
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={2}>
            <NumberInput
              ref={ref}
              value={intervalNumber}
              onChange={onNumberChange}
              fullWidth
              prepend={numberLabel ? [numberLabel] : undefined}
              isInvalid={!!errors}
              name="interval"
              data-test-subj={`${idPrefix}NumberInput`}
              id={`${idPrefix}NumberInput`}
              aria-label={numberLabel || undefined}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiSelect
              fullWidth
              value={intervalUnit}
              options={getTimeOptions(intervalNumber ?? 1)}
              onChange={onIntervalUnitChange}
              data-test-subj={`${idPrefix}UnitInput`}
              aria-label={unitAriaLabel}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }
);
