/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { snapshotDataSelector } from '../../state/selectors';

export const MonitorStatusTitle = () => {
  const { count, loading } = useSelector(snapshotDataSelector);
  return (
    <EuiFlexGroup>
      <EuiFlexItem>Uptime monitor status</EuiFlexItem>
      <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
        {!loading ? (
          <EuiText size="s" color="subdued">
            {count.total} Monitors
          </EuiText>
        ) : (
          <EuiLoadingSpinner size="m" />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
