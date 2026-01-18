/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';

interface PageTitleProps {
  title: ReactNode;
  breakWord?: boolean;
}

export const PageTitle: FC<PageTitleProps> = ({ title, breakWord = true }) => {
  const titleStyles = css`
    word-break: ${breakWord ? 'break-word' : 'normal'};
  `;
  return (
    <EuiTitle size="l" css={titleStyles}>
      <h1>{title}</h1>
    </EuiTitle>
  );
};
