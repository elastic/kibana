/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import {
  INVALID_STACK_ARN_MESSAGE,
  STACK_ARN_HELP_TEXT,
  STACK_ARN_LABEL,
  isStackArnInvalid,
} from '../utils';

export interface StackArnFieldProps {
  value: string;
  /** Receives the raw input value; callers decide whether and when to trim it. */
  onChange: (value: string) => void;
  'data-test-subj': string;
}

/** CloudFormation stack ARN input shared by the wizard's connector form and the AWS onboarding setup. */
export const StackArnField: React.FC<StackArnFieldProps> = ({
  value,
  onChange,
  'data-test-subj': dataTestSubj,
}) => {
  const isInvalid = isStackArnInvalid(value);

  return (
    <EuiFormRow
      fullWidth
      label={STACK_ARN_LABEL}
      helpText={STACK_ARN_HELP_TEXT}
      isInvalid={isInvalid}
      error={isInvalid ? INVALID_STACK_ARN_MESSAGE : undefined}
    >
      <EuiFieldText
        fullWidth
        value={value}
        isInvalid={isInvalid}
        onChange={(e) => onChange(e.target.value)}
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
};
