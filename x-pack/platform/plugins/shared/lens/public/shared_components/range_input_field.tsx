/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldNumber, EuiFormControlLayoutDelimited } from '@elastic/eui';

type RangeInputFieldProps = Partial<{
  isInvalid: boolean;
  label: string;
  helpText: string;
  error: string;
  lowerValue: number | '';
  upperValue: number | '';
  onLowerValueChange: React.ChangeEventHandler<HTMLInputElement> | undefined;
  onUpperValueChange: React.ChangeEventHandler<HTMLInputElement> | undefined;
  onLowerValueBlur: React.FocusEventHandler<HTMLInputElement> | undefined;
  onUpperValueBlur: React.FocusEventHandler<HTMLInputElement> | undefined;
  testSubjLayout?: string;
  testSubjLower?: string;
  testSubjUpper?: string;
}>;

export function RangeInputField({
  isInvalid,
  label,
  helpText,
  error,
  lowerValue,
  onLowerValueChange,
  onLowerValueBlur,
  upperValue,
  onUpperValueChange,
  onUpperValueBlur,
  testSubjLayout,
  testSubjLower,
  testSubjUpper,
}: RangeInputFieldProps) {
  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      isInvalid={isInvalid}
      label={label}
      helpText={helpText}
      error={error}
    >
      <EuiFormControlLayoutDelimited
        data-test-subj={testSubjLayout}
        compressed
        startControl={
          <EuiFieldNumber
            compressed
            value={lowerValue}
            isInvalid={isInvalid}
            data-test-subj={testSubjLower}
            onChange={onLowerValueChange}
            onBlur={onLowerValueBlur}
            step="any"
            controlOnly
          />
        }
        endControl={
          <EuiFieldNumber
            compressed
            value={upperValue}
            data-test-subj={testSubjUpper}
            onChange={onUpperValueChange}
            onBlur={onUpperValueBlur}
            step="any"
            controlOnly
          />
        }
      />
    </EuiFormRow>
  );
}
