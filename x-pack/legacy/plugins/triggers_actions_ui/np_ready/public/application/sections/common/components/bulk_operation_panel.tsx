/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

export const BulkOperationPanel: React.FunctionComponent = ({ children }) => {
  return (
    <EuiFlexGroup wrap responsive={false} gutterSize="xs">
      {children &&
        React.Children.map(children, child =>
          React.isValidElement(child) ? (
            <EuiFlexItem grow={false}>{React.cloneElement(child, {})}</EuiFlexItem>
          ) : (
            child
          )
        )}
    </EuiFlexGroup>
  );
};
