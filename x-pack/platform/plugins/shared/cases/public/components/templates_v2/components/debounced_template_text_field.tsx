/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFieldText, EuiFormRow, EuiTextArea } from '@elastic/eui';
import { useDebouncedFieldValue } from '../hooks/use_debounced_field_value';

interface DebouncedTemplateTextFieldProps {
  label: ReactNode;
  /** Source-of-truth value; the field re-syncs when it changes from outside (YAML edit, load). */
  value: string;
  /** Debounced — fired after the user pauses; also flushed on blur. */
  onChange: (value: string) => void;
  dataTestSubj: string;
  multiline?: boolean;
  isInvalid?: boolean;
  error?: ReactNode;
  helpText?: ReactNode;
}

/**
 * A form field whose keystrokes stay local to this component and only propagate (debounced) to the
 * parent on pause / blur. Isolating the field this way keeps typing instant even when the
 * surrounding form is heavy (async comboboxes, YAML re-serialization on change).
 */
export const DebouncedTemplateTextField: React.FC<DebouncedTemplateTextFieldProps> = ({
  label,
  value,
  onChange,
  dataTestSubj,
  multiline = false,
  isInvalid = false,
  error,
  helpText,
}) => {
  const { value: localValue, setValue, flush } = useDebouncedFieldValue<string>(value, onChange);

  const sharedProps = {
    value: localValue,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValue(event.target.value),
    onBlur: flush,
    isInvalid,
    fullWidth: true,
    'data-test-subj': dataTestSubj,
  };

  return (
    <EuiFormRow label={label} isInvalid={isInvalid} error={error} helpText={helpText} fullWidth>
      {multiline ? <EuiTextArea {...sharedProps} rows={2} /> : <EuiFieldText {...sharedProps} />}
    </EuiFormRow>
  );
};

DebouncedTemplateTextField.displayName = 'DebouncedTemplateTextField';
