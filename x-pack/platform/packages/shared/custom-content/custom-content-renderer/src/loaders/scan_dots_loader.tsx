/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

const CYCLE_MS = 1200;
const DOT_COUNT = 16;
/** Each column waits another tenth of the cycle, left to right. */
const COLUMN_DELAY_MS = CYCLE_MS / 10;

const SCAN_DOTS = Array.from({ length: DOT_COUNT }, (_, index) => ({
  cx: 1.714 + (index % 4) * 6.857,
  cy: 1.714 + Math.floor(index / 4) * 6.857,
  delayMs: (index % 4) * COLUMN_DELAY_MS,
}));

const scanPulse = keyframes`
  0%, 45%, 100% {
    fill: var(--scan-dots-rest);
  }
  15% {
    fill: var(--scan-dots-active);
  }
`;

interface ScanDotsLoaderProps {
  /** Rendered width and height. The graphic is a 24-unit viewBox. */
  size: string | number;
  /** Names the progress indicator. Omit to render a decorative preview. */
  label?: string;
}

/**
 * A 4 by 4 grid of dots lights column by column from left to right.
 */
export const ScanDotsLoader: React.FC<ScanDotsLoaderProps> = ({ size, label }) => {
  const { euiTheme } = useEuiTheme();
  const isProgress = Boolean(label);

  const svgStyles = css`
    --scan-dots-rest: ${euiTheme.colors.lightShade};
    --scan-dots-active: ${euiTheme.colors.textSubdued};
    flex-shrink: 0;
    circle {
      fill: var(--scan-dots-rest);
    }
    @media screen and (prefers-reduced-motion: no-preference) {
      circle {
        animation: ${scanPulse} ${CYCLE_MS}ms ease-in-out infinite;
      }
    }
  `;

  return (
    <svg
      role={isProgress ? 'progressbar' : undefined}
      aria-label={isProgress ? label : undefined}
      aria-hidden={isProgress ? undefined : true}
      data-variant="scan-dots"
      data-test-subj="scanDotsLoader"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      css={svgStyles}
    >
      {SCAN_DOTS.map((dot, index) => (
        <circle
          key={index}
          cx={dot.cx}
          cy={dot.cy}
          r="1.714"
          style={{ animationDelay: `${dot.delayMs}ms` }}
        />
      ))}
    </svg>
  );
};
