/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexItem } from '@elastic/eui';

import type { DraggableUXStyles } from './types';

interface CellProps extends DraggableUXStyles {
  ariaColindex?: number;
  children?: React.ReactNode;
  role?: 'cell' | 'columnheader';
}

export const Cell = ({
  ariaColindex,
  children,
  alignItems,
  flexBasis,
  flexGrow,
  role,
}: CellProps) => {
  return (
    <EuiFlexItem
      style={{
        alignItems,
        flexBasis,
        flexGrow,
      }}
      role={role}
      aria-colindex={ariaColindex}
    >
      {children}
    </EuiFlexItem>
  );
};
