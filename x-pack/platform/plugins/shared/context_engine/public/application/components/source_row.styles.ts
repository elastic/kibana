/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiCanAnimate, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { useMemo } from 'react';

export const useSourceRowMountAnimation = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const enterAnimation = keyframes`
      from {
        opacity: 0;
        transform: translateY(-${euiTheme.size.l}) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    `;

    return css`
      ${euiCanAnimate} {
        animation: ${enterAnimation} ${euiTheme.animation.normal} ${euiTheme.animation.resistance}
          ${euiTheme.animation.fast} both;
      }
    `;
  }, [euiTheme]);
};
