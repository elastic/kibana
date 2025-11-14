/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import type { PropsWithChildren } from 'react';
import React from 'react';

export const ThinkingItemLayout: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    // No gap because we're using the margin on the horizontal divider
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="m" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
