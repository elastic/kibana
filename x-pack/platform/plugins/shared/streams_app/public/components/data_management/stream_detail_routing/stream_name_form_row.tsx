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
  error?: string;
  isInvalid?: boolean;
}

const MAX_NAME_LENGTH = 200;

export function StreamNameFormRow({
  value,
  onChange = () => {},
  disabled = false,
  autoFocus = false,
  error,
  isInvalid = false,
}: StreamNameFormRowProps) {
  const helpText =
    value.length >= MAX_NAME_LENGTH && !disabled
      ? i18n.translate('xpack.streams.streamDetailRouting.nameHelpText', {
          defaultMessage: `Stream name cannot be longer than {maxLength} characters.`,
          values: {
            maxLength: MAX_NAME_LENGTH,
          },
        })
      : undefined;

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.streams.streamDetailRouting.name', {
        defaultMessage: 'Stream name',
      })}
      helpText={helpText}
      error={error}
      isInvalid={isInvalid}
    >
      <EuiFieldText
        data-test-subj="streamsAppRoutingStreamEntryNameField"
        value={value}
        fullWidth
        compressed
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        isInvalid={isInvalid}
      />
    </EuiFormRow>
  );
}
