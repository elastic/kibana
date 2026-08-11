/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export const EmptyMessage = () => {
  return (
    <EuiFlexGroup
      alignItems="center"
      direction="column"
      justifyContent="center"
      css={css`
        min-height: 300px;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
