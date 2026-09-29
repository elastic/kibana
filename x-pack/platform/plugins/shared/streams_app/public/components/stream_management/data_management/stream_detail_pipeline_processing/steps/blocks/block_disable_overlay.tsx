/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export const BlockDisableOverlay = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: ${euiTheme.colors.backgroundBasePlain};
        opacity: 0.4;
        z-index: 9999;
      `}
    />
  );
};
