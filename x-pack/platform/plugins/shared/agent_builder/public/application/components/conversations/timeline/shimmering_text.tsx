/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiCanAnimate, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

const sweep = keyframes`
  from {
    background-position: 100% 0;
  }
  to {
    background-position: 0% 0;
  }
`;

/** Subdued text with a title-color highlight sweeping through it, one pass every 4 × extraSlow. */
export const ShimmeringText: React.FC<{ text: string }> = ({ text }) => {
  const { euiTheme } = useEuiTheme();
  const highlight = euiTheme.colors.title;
  const duration = `${Math.round((parseFloat(String(euiTheme.animation.extraSlow)) || 500) * 4)}ms`;

  return (
    <span
      data-text={text}
      css={css`
        position: relative;
        display: inline-block;
        max-width: 100%;
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
        letter-spacing: inherit;
        color: ${euiTheme.colors.textSubdued};
        &::before {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: linear-gradient(
            90deg,
            transparent 0%,
            transparent 40%,
            ${highlight} 50%,
            transparent 60%,
            transparent 100%
          );
          background-size: 400% 100%;
          background-repeat: no-repeat;
          background-position: 100% 0;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          ${euiCanAnimate} {
            animation: ${sweep} ${duration} linear infinite;
          }
        }
      `}
    >
      {text}
    </span>
  );
};
