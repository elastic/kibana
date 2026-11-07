/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import type { EuiFieldTextProps } from '@elastic/eui';
import { EuiFieldText, EuiFormControlLayout } from '@elastic/eui';

interface ClearableFieldTextProps
  extends Omit<EuiFieldTextProps, 'value' | 'controlOnly' | 'inputRef'> {
  value: string;
  /** Empties the field, which then takes focus, ready for something else. */
  onClear: () => void;
  /** The clear button's test subject. */
  clearTestSubj?: string;
}

/**
 * A text field with EUI's clear button while it has something to clear. The props a form row passes
 * its field, such as its ID and description, reach the input, so the row's label stays its label.
 */
export const ClearableFieldText = ({
  value,
  onClear,
  clearTestSubj,
  compressed,
  fullWidth,
  isInvalid,
  disabled,
  ...inputProps
}: ClearableFieldTextProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <EuiFormControlLayout
      compressed={compressed}
      fullWidth={fullWidth}
      isInvalid={isInvalid}
      isDisabled={disabled}
      clear={
        value && !disabled
          ? {
              onClick: () => {
                onClear();
                inputRef.current?.focus();
              },
              'data-test-subj': clearTestSubj,
            }
          : undefined
      }
    >
      <EuiFieldText
        controlOnly
        compressed={compressed}
        fullWidth={fullWidth}
        isInvalid={isInvalid}
        disabled={disabled}
        value={value}
        inputRef={inputRef}
        {...inputProps}
      />
    </EuiFormControlLayout>
  );
};
