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
const DOT_COUNT = 8;

const ORBIT_RING_DOTS = Array.from({ length: DOT_COUNT }, (_, index) => {
  // Eight dots, one every 45 degrees, starting at the top and moving clockwise.
  const angle = (index * Math.PI) / 4;
  return {
    cx: +(12 + 8.75 * Math.sin(angle)).toFixed(3),
    cy: +(12 - 8.75 * Math.cos(angle)).toFixed(3),
    delayMs: Math.round((index * CYCLE_MS) / DOT_COUNT),
  };
});

const orbitRingPulse = keyframes`
  0%, 45%, 100% {
    fill: var(--orbit-ring-rest);
  }
  15% {
    fill: var(--orbit-ring-active);
  }
`;

interface OrbitRingLoaderProps {
  /** Rendered width and height. The graphic is a 24-unit viewBox. */
  size: string | number;
  /** Names the progress indicator. Omit to render a decorative preview. */
  label?: string;
}

/**
 * Eight round dots pulse clockwise, matching the orbit ring proposal.
 */
export const OrbitRingLoader: React.FC<OrbitRingLoaderProps> = ({ size, label }) => {
  const { euiTheme } = useEuiTheme();
  const isProgress = Boolean(label);

  const svgStyles = css`
    --orbit-ring-rest: ${euiTheme.colors.lightShade};
    --orbit-ring-active: ${euiTheme.colors.textSubdued};
    flex-shrink: 0;
    circle {
      fill: var(--orbit-ring-rest);
    }
    @media screen and (prefers-reduced-motion: no-preference) {
      circle {
        animation: ${orbitRingPulse} ${CYCLE_MS}ms ease-in-out infinite;
      }
    }
  `;

  return (
    <svg
      role={isProgress ? 'progressbar' : undefined}
      aria-label={isProgress ? label : undefined}
      aria-hidden={isProgress ? undefined : true}
      data-variant="orbit-ring"
      data-test-subj="orbitRingLoader"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      css={svgStyles}
    >
      {ORBIT_RING_DOTS.map((dot, index) => (
        <circle
          key={index}
          cx={dot.cx}
          cy={dot.cy}
          r="1.5"
          style={{ animationDelay: `${dot.delayMs}ms` }}
        />
      ))}
    </svg>
  );
};
