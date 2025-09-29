/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface StreamNameFormRowProps {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function StreamNameFormRow({
  value,
  onChange = () => {},
  disabled = false,
  autoFocus = false,
}: StreamNameFormRowProps) {
  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.streams.streamDetailRouting.name', {
        defaultMessage: 'Stream name',
      })}
    >
      <EuiFieldText
        data-test-subj="streamsAppRoutingStreamEntryNameField"
        value={value}
        fullWidth
        compressed
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </EuiFormRow>
  );
}
