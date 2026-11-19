/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

export const CaseViewLoading = () => (
  <EuiFlexGroup gutterSize="none" justifyContent="center" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner data-test-subj="case-view-loading" size="xl" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

CaseViewLoading.displayName = 'CaseViewLoading';
