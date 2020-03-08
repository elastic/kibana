/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiDescribedFormGroup,
  EuiSelectOptionProps,
  EuiFormRow
} from '@elastic/eui';
import { SelectWithPlaceholder } from '../../../../../shared/SelectWithPlaceholder';

export function FormRowSelect({
  title,
  description,
  fieldLabel,
  isLoading,
  options,
  value,
  isDisabled,
  onChange
}: {
  title: string;
  description: string;
  fieldLabel: string;
  isLoading: boolean;
  options?: EuiSelectOptionProps[];
  value?: string;
  isDisabled: boolean;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{title}</h3>}
      description={description}
    >
      <EuiFormRow label={fieldLabel}>
        <SelectWithPlaceholder
          isLoading={isLoading}
          options={options}
          value={value}
          disabled={isDisabled}
          onChange={onChange}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
}
