/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';

interface Props {
  height?: string;
  loading?: boolean;
}

export const ChartWrapper: FC<Props> = ({ loading = false, height = '100%', children }) => {
  const opacity = loading === true ? 0.3 : 1;

  return (
    <Fragment>
      <div
        style={{
          height,
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
          style={{ height, marginTop: `-${height}`, marginBottom: 0 }}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </Fragment>
  );
};
