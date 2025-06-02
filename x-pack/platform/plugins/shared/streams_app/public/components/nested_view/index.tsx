/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';

export function NestedView({
  children,
  last,
  isBeingDragged,
}: {
  children: React.ReactNode;
  last?: boolean;
  isBeingDragged?: boolean;
}) {
  const { euiTheme } = useEuiTheme();

  return isBeingDragged ? (
    <>{children}</>
  ) : (
    <div
      className={css`
        padding-left: ${euiTheme.size.s}; //11px
        margin-left: ${euiTheme.size.s}; //11px
        border-left: ${last ? 'none' : euiTheme.border.thin};
        margin-top: -${euiTheme.size.xs}; //-4px
        padding-top: ${euiTheme.size.xs}; //4px
        position: relative;

        &::before {
          content: '';
          border-bottom: ${euiTheme.border.thin};
          border-left: ${euiTheme.border.thin};
          position: absolute;
          top: 0;
          left: ${last ? '0px' : '-1px'};
          width: ${last ? '9px' : '10px'};
          height: calc(50% + ${euiTheme.size.xs}); // Exactly half of the height of the panel
        }
      `}
    >
      {children}
    </div>
  );
}
