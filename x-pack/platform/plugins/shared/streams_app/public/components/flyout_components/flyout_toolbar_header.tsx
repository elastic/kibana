/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

/**
 * Minimal 40px toolbar header matching the Security alerts flyout pattern.
 * Renders children right-aligned inside a bordered EuiFlyoutHeader.
 */
export function FlyoutToolbarHeader({ children }: { children: React.ReactNode }) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlyoutHeader
      hasBorder
      css={css`
        && {
          padding: 0 calc(${euiTheme.size.xs} + ${euiTheme.size.s}) 0 0;
        }
      `}
    >
      <EuiFlexGroup
        justifyContent="flexEnd"
        alignItems="center"
        responsive={false}
        gutterSize="xs"
        css={css`
          height: ${euiTheme.size.xxl};
        `}
      >
        {children}
      </EuiFlexGroup>
    </EuiFlyoutHeader>
  );
}
