/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

/** A small uppercase label above a title or section. */
export const Eyebrow = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      css={css`
        font-family: ${euiTheme.font.familyCode};
        font-size: ${euiTheme.size.m};
        font-weight: ${euiTheme.font.weight.semiBold};
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: ${euiTheme.colors.textSubdued};
      `}
    >
      {children}
    </span>
  );
};
