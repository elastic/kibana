/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiMinBreakpoint, useEuiTheme } from '@elastic/eui';

interface DetailsColumnsProps {
  start: ReactNode;
  end: ReactNode;
}

/** Two sections side by side with a line between them, stacked on narrow screens. */
export const DetailsColumns = ({ start, end }: DetailsColumnsProps) => {
  const { euiTheme } = useEuiTheme();
  // `EuiFlexGroup` stacks its items below the `m` breakpoint.
  const sideBySide = useEuiMinBreakpoint('m');

  return (
    <EuiFlexGroup gutterSize="none" css={{ flexGrow: 0 }}>
      <EuiFlexItem
        css={{
          paddingBlockEnd: euiTheme.size.l,
          [sideBySide]: {
            borderInlineEnd: euiTheme.border.thin,
            paddingInlineEnd: euiTheme.size.l,
          },
        }}
      >
        {start}
      </EuiFlexItem>
      <EuiFlexItem
        css={{
          paddingBlockEnd: euiTheme.size.l,
          [sideBySide]: { paddingInlineStart: euiTheme.size.l },
        }}
      >
        {end}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
