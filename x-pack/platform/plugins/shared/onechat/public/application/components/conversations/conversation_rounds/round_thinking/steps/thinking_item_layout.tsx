/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface ThinkingItemLayoutProps {
  children: ReactNode;
  icon?: ReactNode;
}

export const ThinkingItemLayout: React.FC<ThinkingItemLayoutProps> = ({ children, icon }) => {
  return (
    <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
      {icon && <EuiFlexItem grow={false}>{icon}</EuiFlexItem>}
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>{children}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
