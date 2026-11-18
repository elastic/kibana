/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import React, { type ReactNode } from 'react';

interface SettingsRowProps {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  'data-test-subj'?: string;
}

/** Label and description on the left, control on the right. */
export const SettingsRow = ({
  title,
  description,
  children,
  'data-test-subj': dataTestSubj,
}: SettingsRowProps) => (
  <EuiFlexGroup gutterSize="l" alignItems="flexStart" data-test-subj={dataTestSubj}>
    <EuiFlexItem grow={1}>
      <EuiTitle size="xxs">
        <h3>{title}</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>{description}</p>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={2}>{children}</EuiFlexItem>
  </EuiFlexGroup>
);
