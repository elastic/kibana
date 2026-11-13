/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';

export const MergeSectionTitle = React.memo<{ title: string; badge?: React.ReactNode }>(
  ({ title, badge }) => (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
      {badge != null ? <EuiFlexItem grow={false}>{badge}</EuiFlexItem> : null}
    </EuiFlexGroup>
  )
);
MergeSectionTitle.displayName = 'MergeSectionTitle';
