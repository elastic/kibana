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
  first,
  isBeingDragged,
  useDarkBorders = false,
}: {
  children: React.ReactNode;
  last?: boolean;
  first?: boolean;
  isBeingDragged?: boolean;
  useDarkBorders?: boolean;
}) {
  const { euiTheme } = useEuiTheme();

  const borderColor = useDarkBorders ? euiTheme.colors.darkShade : euiTheme.border.color;
  const borderStyle = `${euiTheme.border.width.thin} solid ${borderColor}`;

  return isBeingDragged ? (
    <>{children}</>
  ) : (
    <div
      className={css`
        padding-left: ${euiTheme.size.base};
        margin-left: 16px;
        border-left: ${last ? 'none' : borderStyle};
        margin-top: -${euiTheme.size.xs}; //-4px
        padding-top: ${first ? '16px' : euiTheme.size.s}; //8px
        position: relative;

        &::before {
          content: '';
          border-bottom: ${borderStyle};
          border-left: ${borderStyle};
          position: absolute;
          top: 0;
          left: ${last ? '0px' : '-1px'};
          width: 26px;
          height: calc(50% + ${euiTheme.size.xs}); // Exactly half of the height of the panel
        }
      `}
    >
      {children}
    </div>
  );
}
