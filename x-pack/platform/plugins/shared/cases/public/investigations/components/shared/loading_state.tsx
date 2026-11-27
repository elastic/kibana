/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import * as i18n from './translations';

export interface LoadingStateProps {
  label?: string;
  size?: 'm' | 'l' | 'xl';
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label = i18n.LOADING, size = 'l' }) => (
  <EuiFlexGroup
    justifyContent="center"
    alignItems="center"
    direction="column"
    gutterSize="m"
    responsive={false}
    role="status"
    aria-live="polite"
    data-test-subj="investigationLoadingState"
  >
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size={size} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        {label}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
LoadingState.displayName = 'LoadingState';
