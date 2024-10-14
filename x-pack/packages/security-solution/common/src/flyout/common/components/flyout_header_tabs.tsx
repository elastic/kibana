/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiTabs } from '@elastic/eui';
import { css } from '@emotion/react';

interface FlyoutHeaderTabsProps extends React.ComponentProps<typeof EuiTabs> {
  children: React.ReactNode;
}

/**
 * Wrapper of `EuiTabs`, setting bottom margin to align with the flyout header divider
 */
export const FlyoutHeaderTabs: FC<FlyoutHeaderTabsProps> = memo(
  ({ children, ...flyoutTabsProps }) => {
    return (
      <EuiTabs
        size="l"
        expand
        css={css`
          margin-bottom: -17px;
        `}
        {...flyoutTabsProps}
      >
        {children}
      </EuiTabs>
    );
  }
);

FlyoutHeaderTabs.displayName = 'FlyoutHeaderTabs';
