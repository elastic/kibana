/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProgress, EuiSkeletonText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export const WorkflowDetailLoadingState = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiProgress size="xs" color="primary" />
      <div css={css({ padding: euiTheme.size.xl })}>
        <div css={css({ width: '100px' })}>
          <EuiSkeletonText isLoading={true} lines={1} size="s" />
        </div>
        <div css={css({ width: '200px' })}>
          <EuiSkeletonText isLoading={true} lines={1} size="s" />
        </div>
        <div css={css({ width: '120px' })}>
          <EuiSkeletonText isLoading={true} lines={1} size="s" />
        </div>
        <div css={css({ width: '70px' })}>
          <EuiSkeletonText isLoading={true} lines={1} size="s" />
        </div>
      </div>
    </>
  );
};
