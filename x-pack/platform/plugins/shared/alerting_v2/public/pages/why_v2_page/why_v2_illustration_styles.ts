/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';

const INK = '#101C3F';
const BLUE = '#0B64DD';
const TEAL = '#48EFCF';
const NAVY = '#153385';
const PINK = '#EE72A6';
const GREY = '#D3DAE6';

export const illustrationColors = {
  ink: INK,
  blue: BLUE,
  teal: TEAL,
  navy: NAVY,
  pink: PINK,
  grey: GREY,
};

const drawLine = keyframes`
  from { stroke-dashoffset: 120; }
  to { stroke-dashoffset: 0; }
`;

const successBadgePulse = keyframes`
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; }
`;

const pulseNode = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
`;

export const whyV2IllustrationStyles = {
  root: css`
    width: 100%;
    max-width: 280px;
    display: block;

    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
      }
    }
  `,
  frame: css`
    position: relative;
    width: 100%;
    max-width: 280px;
  `,
  baseImage: css`
    display: block;
    width: 100%;
    height: auto;
  `,
  animationOverlay: css`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  `,
  timelineLine: css`
    stroke-dasharray: 120;
    animation: ${drawLine} 2.4s ease-out infinite alternate;
  `,
  policyNode: css`
    transform-origin: center;
    animation: ${pulseNode} 2.4s ease-in-out infinite;
  `,
  successBadge: css`
    transform-origin: center;
    animation: ${successBadgePulse} 3s ease-in-out infinite;
  `,
};
