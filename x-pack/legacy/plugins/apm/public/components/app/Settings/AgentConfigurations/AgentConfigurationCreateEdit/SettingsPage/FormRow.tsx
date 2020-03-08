/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiFieldNumber,
  EuiDescribedFormGroup
} from '@elastic/eui';
import { SelectWithPlaceholder } from '../../../../../shared/SelectWithPlaceholder';
import { Setting } from '../settings';

export function FormRow({
  setting,
  value,
  onChange
}: {
  setting: Setting;
  value?: string;
  onChange: (key: string, value: string) => void;
}) {
  let formRow: JSX.Element | null = null;

  if (setting.type === 'text') {
    formRow = (
      <EuiFormRow
        label={setting.label}
        helpText={setting.helpText}
        error={setting.validationError}
        isInvalid={value != null && value !== '' && !setting.isValid(value)}
      >
        <EuiFieldText
          placeholder={setting.placeholder}
          value={value || ''}
          onChange={e => onChange(setting.key, e.target.value)}
        />
      </EuiFormRow>
    );
  }

  if (setting.type === 'number') {
    formRow = (
      <EuiFormRow
        label={setting.label}
        helpText={setting.helpText}
        error={setting.validationError}
        isInvalid={value != null && value !== '' && !setting.isValid(value)}
      >
        <EuiFieldNumber
          placeholder={setting.placeholder}
          value={value as any}
          min={setting.min}
          max={setting.max}
          onChange={e => onChange(setting.key, e.target.value)}
        />
      </EuiFormRow>
    );
  }

  if (setting.type === 'select') {
    formRow = (
      <EuiFormRow label={setting.label} helpText={setting.helpText}>
        <SelectWithPlaceholder
          placeholder={setting.placeholder}
          options={setting.options}
          value={value}
          onChange={e => onChange(setting.key, e.target.value)}
        />
      </EuiFormRow>
    );
  }

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{setting.label}</h3>}
      description={setting.helpText}
    >
      {formRow}
    </EuiDescribedFormGroup>
  );
}
