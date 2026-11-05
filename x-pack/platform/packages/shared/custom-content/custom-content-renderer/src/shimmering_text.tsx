/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

const shimmerSweep = keyframes`
  from {
    background-position: 100% 0;
  }
  to {
    background-position: 0% 0;
  }
`;

interface ShimmeringTextProps {
  text: string;
  /** Plays the highlight sweep. When off, the text stays in the title colour. */
  enabled: boolean;
}

/**
 * A status line with a highlight that sweeps across it while something loads.
 * One sweep takes three times `animation.extraSlow` and eases linearly.
 */
export const ShimmeringText: React.FC<ShimmeringTextProps> = ({ text, enabled }) => {
  const { euiTheme } = useEuiTheme();

  const shimmerStyles = css`
    position: relative;
    display: inline-block;
    color: ${euiTheme.colors.textSubdued};

    &::before {
      content: attr(data-text);
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image: linear-gradient(
        90deg,
        transparent 0%,
        transparent 32%,
        ${euiTheme.colors.textHeading} 50%,
        transparent 68%,
        transparent 100%
      );
      background-size: 300% 100%;
      background-repeat: no-repeat;
      background-position: 100% 0;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      -webkit-text-fill-color: transparent;
    }

    @media (prefers-reduced-motion: no-preference) {
      &::before {
        animation: ${shimmerSweep} calc(${euiTheme.animation.extraSlow} * 3) linear infinite;
      }
    }
  `;

  return (
    <span data-text={enabled ? text : undefined} css={enabled ? shimmerStyles : undefined}>
      {text}
    </span>
  );
};
