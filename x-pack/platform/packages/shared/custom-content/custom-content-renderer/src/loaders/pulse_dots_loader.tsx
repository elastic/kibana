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
const GRID_COUNT = 16;
/** The four corners of the 4 by 4 grid are left empty. */
const CORNER_INDEXES = new Set([0, 3, 12, 15]);
/** The inner 2 by 2 lights first. The surrounding dots follow 16% of the cycle later. */
const CENTER_INDEXES = new Set([5, 6, 9, 10]);
const OUTER_DELAY_MS = Math.round(CYCLE_MS * 0.16);

const PULSE_DOTS = Array.from({ length: GRID_COUNT }, (_, index) => index)
  .filter((index) => !CORNER_INDEXES.has(index))
  .map((index) => ({
    cx: 1.714 + (index % 4) * 6.857,
    cy: 1.714 + Math.floor(index / 4) * 6.857,
    delayMs: CENTER_INDEXES.has(index) ? 0 : OUTER_DELAY_MS,
  }));

const pulseDots = keyframes`
  0%, 45%, 100% {
    fill: var(--pulse-dots-rest);
  }
  15% {
    fill: var(--pulse-dots-active);
  }
`;

interface PulseDotsLoaderProps {
  /** Rendered width and height. The graphic is a 24-unit viewBox. */
  size: string | number;
  /** Names the progress indicator. Omit to render a decorative preview. */
  label?: string;
}

/**
 * Twelve dots in a 4 by 4 grid with the corners removed. The center lights, then the ring.
 */
export const PulseDotsLoader: React.FC<PulseDotsLoaderProps> = ({ size, label }) => {
  const { euiTheme } = useEuiTheme();
  const isProgress = Boolean(label);

  const svgStyles = css`
    --pulse-dots-rest: ${euiTheme.colors.lightShade};
    --pulse-dots-active: ${euiTheme.colors.textSubdued};
    flex-shrink: 0;
    circle {
      fill: var(--pulse-dots-rest);
    }
    @media screen and (prefers-reduced-motion: no-preference) {
      circle {
        animation: ${pulseDots} ${CYCLE_MS}ms ease-in-out infinite;
      }
    }
  `;

  return (
    <svg
      role={isProgress ? 'progressbar' : undefined}
      aria-label={isProgress ? label : undefined}
      aria-hidden={isProgress ? undefined : true}
      data-variant="pulse-dots"
      data-test-subj="pulseDotsLoader"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      css={svgStyles}
    >
      {PULSE_DOTS.map((dot, index) => (
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
