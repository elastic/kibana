/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber } from '@elastic/eui';

import { isValidPriority } from '../../../common/validation';

/** Keys a number field accepts that can't be part of a non-negative integer. */
const INVALID_PRIORITY_KEYS: readonly string[] = ['-', '+', ',', '.', 'e', 'E'];

/** Reads a priority from the field, turning anything that isn't a non-negative integer into 0. */
export const parsePriority = (value: string): number => {
  const priority = value.trim() === '' ? 0 : Number(value);
  return isValidPriority(priority) ? priority : 0;
};

export interface PriorityFieldProps {
  value: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  inputRef: (element: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onBlur: () => void;
  // `id` and `aria-describedby` are passed in by `EuiFormRow`.
  id?: string;
  'aria-describedby'?: string;
}

export const PriorityField = ({
  value,
  isDisabled,
  isInvalid,
  inputRef,
  onChange,
  onBlur,
  id,
  'aria-describedby': ariaDescribedBy,
}: PriorityFieldProps) => (
  <EuiFieldNumber
    id={id}
    aria-describedby={ariaDescribedBy}
    min={0}
    step={1}
    value={value}
    isInvalid={isInvalid}
    disabled={isDisabled}
    inputRef={inputRef}
    onChange={(event) => onChange(event.target.value)}
    onKeyDown={(event) => {
      if (INVALID_PRIORITY_KEYS.includes(event.key)) {
        event.preventDefault();
      }
    }}
    onBlur={() => {
      onChange(String(parsePriority(value)));
      onBlur();
    }}
    data-test-subj="searchBoostRuleFlyoutPriority"
  />
);
