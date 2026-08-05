/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';

export const buildSuperSelectOption = <T extends string>({
  value,
  label,
  description,
}: {
  value: T;
  label: string;
  description?: string;
}): EuiSuperSelectOption<T> => ({
  value,
  inputDisplay: label,
  dropdownDisplay: description ? (
    <>
      <strong>{label}</strong>
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
    </>
  ) : (
    label
  ),
});
