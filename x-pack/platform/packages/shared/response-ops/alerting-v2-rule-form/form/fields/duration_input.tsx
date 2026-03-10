/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { EuiFlexItem, EuiFormRow, EuiFlexGroup, EuiSelect, EuiFieldNumber } from '@elastic/eui';
import {
  getDurationUnitValue,
  getDurationNumberInItsUnit,
  getTimeOptions,
  POSITIVE_INTEGER_REGEX,
  INVALID_NUMBER_KEYS,
} from '../utils';

export interface DurationInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fallback duration string used when `value` is empty */
  fallback?: string;
  errors?: string;
  numberLabel: string;
  unitLabel: string;
  dataTestSubj: string;
  idPrefix: string;
}

/**
 * A reusable duration input consisting of a number field and a time-unit select.
 *
 * Manages a local display value so the user can freely clear and retype the number.
 * The form value is only updated when the input contains a valid positive integer.
 * On blur, an empty or invalid value is restored to the last valid form value.
 */
export const DurationInput = React.forwardRef<HTMLInputElement, DurationInputProps>(
  ({ value, onChange, fallback, errors, numberLabel, unitLabel, dataTestSubj, idPrefix }, ref) => {
    const effectiveValue = value || fallback || '1m';

    const intervalNumber = useMemo(() => {
      return getDurationNumberInItsUnit(effectiveValue);
    }, [effectiveValue]);

    const intervalUnit = useMemo(() => {
      return getDurationUnitValue(effectiveValue);
    }, [effectiveValue]);

    // Local display value allows the user to clear the input while editing.
    const [localNumber, setLocalNumber] = useState<string>(String(intervalNumber ?? ''));

    // Keep local state in sync when the form value changes externally.
    useEffect(() => {
      setLocalNumber(String(intervalNumber ?? ''));
    }, [intervalNumber]);

    const onIntervalNumberChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.trim();
        // Always update the displayed value so the input is responsive.
        setLocalNumber(val);
        // Only propagate to the form when the value is a valid positive integer.
        if (POSITIVE_INTEGER_REGEX.test(val)) {
          const parsedValue = parseInt(val, 10);
          onChange(`${parsedValue}${intervalUnit}`);
        }
      },
      [intervalUnit, onChange]
    );

    // On blur, if the field is empty or invalid, restore the last valid form value.
    const onBlur = useCallback(() => {
      if (!POSITIVE_INTEGER_REGEX.test(localNumber)) {
        setLocalNumber(String(intervalNumber ?? 1));
      }
    }, [localNumber, intervalNumber]);

    const onIntervalUnitChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(`${intervalNumber}${e.target.value}`);
      },
      [intervalNumber, onChange]
    );

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (INVALID_NUMBER_KEYS.includes(e.key)) {
        e.preventDefault();
      }
    }, []);

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
            <EuiFieldNumber
              fullWidth
              prepend={[numberLabel]}
              isInvalid={!!errors}
              value={localNumber}
              name="interval"
              data-test-subj={`${idPrefix}NumberInput`}
              onChange={onIntervalNumberChange}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
              id={`${idPrefix}NumberInput`}
              itemID={`${idPrefix}NumberInput`}
              aria-label={numberLabel}
              inputRef={ref}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiSelect
              fullWidth
              value={intervalUnit}
              options={getTimeOptions(intervalNumber ?? 1)}
              onChange={onIntervalUnitChange}
              data-test-subj={`${idPrefix}UnitInput`}
              aria-label={unitLabel}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }
);
