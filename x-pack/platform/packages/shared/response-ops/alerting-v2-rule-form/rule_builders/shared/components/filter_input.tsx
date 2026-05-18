/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface FilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  helpText?: string;
  placeholder?: string;
  isInvalid?: boolean;
  error?: string;
  fullWidth?: boolean;
  compressed?: boolean;
  'data-test-subj'?: string;
}

export const FilterInput = ({
  value,
  onChange,
  onBlur,
  label,
  helpText,
  placeholder,
  isInvalid,
  error,
  fullWidth = true,
  compressed = false,
  'data-test-subj': dataTestSubj,
}: FilterInputProps) => {
  const defaultPlaceholder = i18n.translate(
    'xpack.alertingV2.ruleBuilder.filterInput.placeholder',
    { defaultMessage: 'e.g. status >= 400 AND service.name == "web"' }
  );

  const input = (
    <EuiFieldText
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder ?? defaultPlaceholder}
      fullWidth={fullWidth}
      compressed={compressed}
      isInvalid={isInvalid}
      data-test-subj={dataTestSubj}
      prepend={i18n.translate('xpack.alertingV2.ruleBuilder.filterInput.prepend', {
        defaultMessage: 'WHERE',
      })}
    />
  );

  if (!label) {
    return input;
  }

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={isInvalid}
      error={error}
      fullWidth={fullWidth}
    >
      {input}
    </EuiFormRow>
  );
};
