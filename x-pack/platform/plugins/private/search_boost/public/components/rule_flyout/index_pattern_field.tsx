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
  isDisabled?: boolean;
  disabledTooltip?: string;
  isInvalid?: boolean;
  inputRef: (element: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  // `id` and `aria-describedby` are passed in by `EuiFormRow`.
  id?: string;
  'aria-describedby'?: string;
}

/** A text field for one index pattern or name, with a button that clears it. */
export const IndexPatternField = ({
  value,
  placeholder,
  isDisabled,
  disabledTooltip,
  isInvalid,
  inputRef,
  onChange,
  onBlur,
  id,
  'aria-describedby': ariaDescribedBy,
}: IndexPatternFieldProps) => {
  const inputElement = useRef<HTMLInputElement | null>(null);

  const field = (
    <EuiFormControlLayout
      fullWidth
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      clear={
        value && !isDisabled
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
        disabled={isDisabled}
        inputRef={(element) => {
          inputElement.current = element;
          inputRef(element);
        }}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        data-test-subj="searchBoostRuleFlyoutIndexPattern"
      />
    </EuiFormControlLayout>
  );

  return isDisabled && disabledTooltip ? (
    <EuiToolTip
      content={disabledTooltip}
      display="block"
      anchorProps={{ 'data-test-subj': 'searchBoostRuleFlyoutIndexPatternTip' }}
    >
      {/* The field is disabled, so this wrapper takes focus to show the tooltip. */}
      <div tabIndex={0} data-test-subj="searchBoostRuleFlyoutIndexPatternTrigger">
        {field}
      </div>
    </EuiToolTip>
  ) : (
    field
  );
};
