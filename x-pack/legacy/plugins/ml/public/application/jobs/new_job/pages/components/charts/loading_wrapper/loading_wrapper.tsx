/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

interface Props {
  hasData: boolean;
  height?: string;
  loading?: boolean;
}

export const LoadingWrapper: FC<Props> = ({ hasData, loading = false, height, children }) => {
  const opacity = loading === true ? (hasData === true ? 0.3 : 0) : 1;

  return (
    <Fragment>
      <div
        style={{
          height: '100%',
          opacity,
          transition: 'opacity 0.2s',
        }}
      >
        {children}
      </div>
      {loading === true && (
        <EuiFlexGroup
          justifyContent="spaceAround"
          alignItems="center"
          style={height !== undefined ? { height, marginTop: `-${height}` } : {}}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </Fragment>
  );
};
