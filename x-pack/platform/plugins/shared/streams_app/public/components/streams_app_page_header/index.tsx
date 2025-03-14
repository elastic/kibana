/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiPageHeader, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';

export function StreamsAppPageHeader({
  title,
  children,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  const theme = useEuiTheme().euiTheme;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiPageHeader
        className={css`
          padding: ${theme.size.m} ${theme.size.l};
        `}
      >
        {title}
      </EuiPageHeader>
      {children}
    </EuiFlexGroup>
  );
}
