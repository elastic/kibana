/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';

interface TargetStatusProps {
  label: string;
  color: 'success' | 'subdued';
  iconType?: string;
  'data-test-subj'?: string;
}

/** A status beside a targets field's label, such as how many targets it has. */
export const TargetStatus = ({
  label,
  color,
  iconType,
  'data-test-subj': dataTestSubj,
}: TargetStatusProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      size="xs"
      color={color}
      css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.xs }}
      data-test-subj={dataTestSubj}
    >
      {iconType && <EuiIcon type={iconType} size="s" aria-hidden={true} />}
      {label}
    </EuiText>
  );
};
