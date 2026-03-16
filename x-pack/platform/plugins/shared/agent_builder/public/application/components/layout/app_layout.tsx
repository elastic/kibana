/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { UnifiedSidebar } from './unified_sidebar/unified_sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { euiTheme } = useEuiTheme();

  const contentStyles = css`
    overflow: auto;
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;

  return (
    <EuiFlexGroup gutterSize="none" style={{ height: '100%', width: '100%' }}>
      <EuiFlexItem grow={false}>
        <UnifiedSidebar />
      </EuiFlexItem>
      <EuiFlexItem css={contentStyles}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
