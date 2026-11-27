/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiFormRowProps } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import type { ControllerFieldState } from 'react-hook-form';
import type { BaseFieldProps } from './types';

type FieldRowProps = Pick<BaseFieldProps, 'label' | 'labelAppend' | 'helpText'> &
  Pick<EuiFormRowProps, 'children'> & {
    fieldState: ControllerFieldState;
    id?: string;
    'data-test-subj'?: string;
  };

/** Single place where a field's validation error is rendered, so every wrapper displays it alike. */
export const FieldRow = ({
  fieldState: { error },
  children,
  'data-test-subj': dataTestSubj,
  ...rowProps
}: FieldRowProps) => (
  <EuiFormRow
    fullWidth
    isInvalid={Boolean(error)}
    error={error?.message}
    data-test-subj={dataTestSubj ? `${dataTestSubj}-row` : undefined}
    {...rowProps}
  >
    {children}
  </EuiFormRow>
);
FieldRow.displayName = 'FieldRow';
