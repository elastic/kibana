/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiFormRow, type EuiComboBoxOptionOption } from '@elastic/eui';
import { getSignalLabel } from '../../streams_layout/destinations/destination_type_config';

interface SignalPickerProps {
  label: string;
  helpText?: string;
  options: readonly string[];
  selected: readonly string[];
  error?: string;
  onChange: (signals: string[]) => void;
  dataTestSubj: string;
}

const toOption = (signal: string): EuiComboBoxOptionOption<string> => ({
  label: getSignalLabel(signal),
  value: signal,
});

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
  return (
    <EuiFormRow fullWidth label={label} helpText={helpText} isInvalid={isInvalid} error={error}>
      <EuiComboBox
        compressed
        fullWidth
        aria-label={label}
        isInvalid={isInvalid}
        options={options.map(toOption)}
        selectedOptions={selected.map(toOption)}
        onChange={(next) => onChange(next.flatMap(({ value }) => (value ? [value] : [])))}
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
}
