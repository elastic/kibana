/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { css } from '@emotion/react';

export const useAnimatedProgressBarBackground = (color: string) => {
  return useMemo(() => {
    const progressBackground = {
      background: `repeating-linear-gradient(
            -45deg,
            transparent 0 6px,
            rgba(0, 0, 0, 0.1) 6px 12px
          ),
          ${color}`,
      // 0.707 = cos(45deg)
      backgroundSize: 'calc(12px / 0.707) 100%,  100% 800%',
      backgroundPosition: 'inherit',
    };

    return css({
      'progress[value]': {
        animation: 'aiopsAnimatedProgress 4s infinite linear',

        '::-webkit-progress-inner-element': {
          overflow: 'hidden',
          backgroundPosition: 'inherit',
        },
        '::-webkit-progress-bar': {
          backgroundColor: 'transparent',
          backgroundPosition: 'inherit',
        },

        '::-webkit-progress-value': progressBackground,
        '::-moz-progress-bar': progressBackground,

        '@keyframes aiopsAnimatedProgress': {
          '0%': {
            backgroundPosition: '0 0',
          },
          '100%': {
            backgroundPosition: 'calc(10 * (12px / 0.707)) 100%',
          },
        },
      },
    });
  }, [color]);
};
