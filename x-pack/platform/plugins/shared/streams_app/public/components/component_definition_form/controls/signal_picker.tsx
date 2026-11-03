/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';

interface SignalPickerProps {
  label: string;
  helpText?: string;
  options: readonly string[];
  selected: readonly string[];
  error?: string;
  onChange: (signals: string[]) => void;
  dataTestSubj: string;
}

/** Chooses telemetry signals, for a whole component or for one item of its configuration. */
export function SignalPicker({
  label,
  helpText,
  options,
  selected,
  error,
  onChange,
  dataTestSubj,
}: SignalPickerProps) {
  const isInvalid = error !== undefined;
  // Signals are read back from labels: EuiComboBox returns the selected options exactly as given.
  return (
    <EuiFormRow fullWidth label={label} helpText={helpText} isInvalid={isInvalid} error={error}>
      <EuiComboBox
        compressed
        fullWidth
        aria-label={label}
        isInvalid={isInvalid}
        options={options.map((signal) => ({ label: signal }))}
        selectedOptions={selected.map((signal) => ({ label: signal }))}
        onChange={(next) => onChange(next.map(({ label: signal }) => signal))}
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
}
