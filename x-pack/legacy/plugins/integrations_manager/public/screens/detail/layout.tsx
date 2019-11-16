/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, ReactNode } from 'react';
import { EuiFlexItem } from '@elastic/eui';

interface ColumnProps {
  children?: ReactNode;
  className?: string;
}

export const LeftColumn: FunctionComponent<ColumnProps> = ({ children, ...rest }) => {
  return (
    <EuiFlexItem grow={2} {...rest}>
      {children}
    </EuiFlexItem>
  );
};

export const CenterColumn: FunctionComponent<ColumnProps> = ({ children, ...rest }) => {
  return (
    <EuiFlexItem grow={7} {...rest}>
      {children}
    </EuiFlexItem>
  );
};

export const RightColumn: FunctionComponent<ColumnProps> = ({ children, ...rest }) => {
  return (
    <EuiFlexItem grow={3} {...rest}>
      {children}
    </EuiFlexItem>
  );
};
