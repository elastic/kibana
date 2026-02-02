/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ChangeEvent } from 'react';
import { EuiFormRow, EuiTextArea } from '@elastic/eui';

interface Props {
  value: string;
  label?: string;
  testId?: string;
  ariaLabel?: string;
  placeholder?: string;
  handleChangeValue: (feedback: string) => void;
}

export const FeedbackTextArea = ({
  label,
  testId,
  ariaLabel,
  placeholder,
  value,
  handleChangeValue,
}: Props) => {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    handleChangeValue(e.target.value);
  };

  return (
    <EuiFormRow label={label}>
      <EuiTextArea
        fullWidth
        rows={4}
        data-test-subj={testId}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={handleChange}
      />
    </EuiFormRow>
  );
};
