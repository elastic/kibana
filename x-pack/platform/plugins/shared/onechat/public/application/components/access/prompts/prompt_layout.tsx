/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export const PromptLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const promptLayoutStyles = css`
    display: flex;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;
  return <div css={promptLayoutStyles}>{children}</div>;
};
