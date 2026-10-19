/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

interface TargetStatusProps {
  label: string;
  'data-test-subj'?: string;
}

/** A status beside a targets field's label, such as how many targets it has. */
export const TargetStatus = ({ label, 'data-test-subj': dataTestSubj }: TargetStatusProps) => (
  <EuiText size="xs" color="subdued" data-test-subj={dataTestSubj}>
    {label}
  </EuiText>
);
