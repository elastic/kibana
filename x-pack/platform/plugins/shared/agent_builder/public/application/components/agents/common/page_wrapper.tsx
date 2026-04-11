/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { CONTAINER_WIDTH } from './constants';

export const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      css={css`
        width: ${CONTAINER_WIDTH};
        margin: 0 auto;
      `}
    >
      {children}
    </div>
  );
};
