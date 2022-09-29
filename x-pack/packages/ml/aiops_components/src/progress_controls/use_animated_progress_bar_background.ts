/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { css } from '@emotion/react';

export const useAnimatedProgressBarBackground = (color: string) => {
  return useMemo(
    () => css`
      progress[value] {
        display: block;
        width: 100%;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        border: none;
        animation: aiopsAnimatedProgress 4s infinite linear;

        ::-webkit-progress-inner-element {
          overflow: hidden;
          background-position: inherit;
        }
        ::-webkit-progress-bar {
          background-color: transparent;
          background-position: inherit;
        }
        ::-webkit-progress-value {
          background: repeating-linear-gradient(
              -45deg,
              transparent 0 6px,
              rgba(0, 0, 0, 0.1) 6px 12px
            ),
            ${color};
          background-size: calc(12px / 0.707) 100%, /* 0.707 = cos(45deg)*/ 100% 800%;
          background-position: inherit;
        }
        ::-moz-progress-bar {
          background: repeating-linear-gradient(
              -45deg,
              transparent 0 6px,
              rgba(0, 0, 0, 0.1) 6px 12px
            ),
            ${color};
          background-size: calc(12px / 0.707) 100%, /* 0.707 = cos(45deg)*/ 100% 800%;
          background-position: inherit;
        }
      }

      @keyframes aiopsAnimatedProgress {
        0% {
          background-position: 0 0;
        }
        100% {
          background-position: calc(10 * (12px / 0.707)) 100%;
        }
      }
    `,
    [color]
  );
};
