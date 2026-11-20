/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import type { FocusEventHandler } from 'react';
import { EuiFieldText, EuiFormControlLayout, EuiToolTip } from '@elastic/eui';

export interface IndexPatternFieldProps {
  value: string;
  placeholder: string;
  /** Why the field can't be used yet, shown in a tooltip. */
  disabledReason?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  inputRef: (element: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  // Passed in by `EuiFormRow`.
  id?: string;
  'aria-describedby'?: string;
  onFocus?: FocusEventHandler<HTMLInputElement>;
}

/** A text field for one index pattern or name, with a button that clears it. */
export const IndexPatternField = ({
  value,
  placeholder,
  disabledReason,
  isDisabled,
  isInvalid,
  inputRef,
  onChange,
  onBlur,
  id,
  'aria-describedby': ariaDescribedBy,
  onFocus,
}: IndexPatternFieldProps) => {
  const inputElement = useRef<HTMLInputElement | null>(null);
  const isFieldDisabled = isDisabled || Boolean(disabledReason);

  const field = (
    <EuiFormControlLayout
      fullWidth
      isInvalid={isInvalid}
      isDisabled={isFieldDisabled}
      clear={
        value && !isFieldDisabled
          ? {
              onClick: () => {
                onChange('');
                inputElement.current?.focus();
              },
              'data-test-subj': 'searchBoostRuleFlyoutIndexPatternClear',
            }
          : undefined
      }
    >
      <EuiFieldText
        controlOnly
        fullWidth
        id={id}
        aria-describedby={ariaDescribedBy}
        value={value}
        placeholder={placeholder}
        isInvalid={isInvalid}
        disabled={isFieldDisabled}
        inputRef={(element) => {
          inputElement.current = element;
          inputRef(element);
        }}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        data-test-subj="searchBoostRuleFlyoutIndexPattern"
      />
    </EuiFormControlLayout>
  );

  return disabledReason ? (
    <EuiToolTip
      content={disabledReason}
      display="block"
      anchorProps={{ 'data-test-subj': 'searchBoostRuleFlyoutIndexPatternTip' }}
    >
      {field}
    </EuiToolTip>
  ) : (
    field
  );
};
