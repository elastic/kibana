/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';

export function StreamsAppPageHeaderTitle({ title }: { title: React.ReactNode }) {
  const theme = useEuiTheme().euiTheme;
  return (
    <EuiTitle
      size="l"
      className={css`
        padding-top: ${theme.size.m};
      `}
    >
      <h1>{title}</h1>
    </EuiTitle>
  );
}
