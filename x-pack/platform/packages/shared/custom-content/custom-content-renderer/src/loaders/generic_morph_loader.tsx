/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import {
  GENERIC_DOT_ORDER,
  MORPH_DOT_COUNT,
  MORPH_DOT_PITCH,
  MORPH_DOT_RADIUS,
  MORPH_GRID_SIZE,
} from './dot_morph_geometry';

const blink = keyframes`
  0% {
    fill: var(--dot-off);
    animation-timing-function: var(--ease-resistance);
  }
  10% {
    fill: var(--dot-on);
    animation-timing-function: var(--ease-resistance);
  }
  20% {
    fill: var(--dot-off);
  }
  100% {
    fill: var(--dot-off);
  }
`;

const frameStyles = css`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`;

const layerStyles = css`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  filter: blur(0);
  transform: scale(1);
`;

const hiddenLayerStyles = css`
  opacity: 0;
  filter: blur(2px);
  transform: scale(0.6);
`;

const dotStyles = css`
  overflow: visible;

  circle {
    fill: var(--dot-off);
  }

  @media (prefers-reduced-motion: no-preference) {
    circle {
      animation: ${blink} calc(var(--speed-extra-slow) * 3) linear infinite;
      animation-delay: calc(var(--n) * var(--speed-extra-fast) * -1);
    }
  }
`;

const motionLayerStyles = css`
  @media (prefers-reduced-motion: no-preference) {
    transition: opacity var(--speed-normal) var(--ease-bounce),
      filter var(--speed-normal) var(--ease-bounce),
      transform var(--speed-normal) var(--ease-bounce);
  }
`;

export interface GenericMorphLoaderProps {
  /** Rendered width and height of the avatar slot. */
  size?: number;
  /** `true` shows the dot grid. `false` swaps the grid back to the avatar. */
  isLoading?: boolean;
  /** The agent's own avatar, shown while nothing is generating. */
  avatar?: React.ReactNode;
  /** Names the progress indicator. */
  label?: string;
  /** Called once the dots have swapped back to the avatar. */
  onSettled?: () => void;
}

/**
 * A neutral dot grid while a response is generating, swapping back to the agent's avatar
 * when it finishes. Drawn for every agent other than the Elastic AI Agent.
 */
export const GenericMorphLoader: React.FC<GenericMorphLoaderProps> = ({
  size = 16,
  isLoading = true,
  avatar,
  label,
  onSettled,
}) => {
  const { euiTheme } = useEuiTheme();
  const [shown, setShown] = useState(isLoading);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    setShown(isLoading);
    if (isLoading) {
      return;
    }
    const settledTimer = setTimeout(
      () => onSettledRef.current?.(),
      parseFloat(euiTheme.animation.normal)
    );
    return () => clearTimeout(settledTimer);
  }, [euiTheme.animation.normal, isLoading]);

  return (
    <span
      data-test-subj="genericDotMorphLoader"
      data-shown={shown ? 'true' : 'false'}
      data-size={size}
      css={[
        frameStyles,
        css`
          inline-size: ${size}px;
          block-size: ${size}px;
        `,
      ]}
      style={
        {
          '--dot-off': euiTheme.colors.lightShade,
          '--dot-on': euiTheme.colors.textSubdued,
          '--speed-extra-fast': euiTheme.animation.extraFast,
          '--speed-extra-slow': euiTheme.animation.extraSlow,
          '--speed-normal': euiTheme.animation.normal,
          '--ease-bounce': euiTheme.animation.bounce,
          '--ease-resistance': euiTheme.animation.resistance,
        } as CSSProperties
      }
      role={shown ? 'progressbar' : undefined}
      aria-label={shown ? label : undefined}
    >
      <span css={[layerStyles, motionLayerStyles, shown && hiddenLayerStyles]} aria-hidden={shown}>
        {avatar}
      </span>
      <span css={[layerStyles, motionLayerStyles, !shown && hiddenLayerStyles]} aria-hidden={true}>
        <svg css={dotStyles} viewBox="0 0 32 32" width={size} height={size}>
          {Array.from({ length: MORPH_DOT_COUNT }, (_, cell) => (
            <circle
              key={cell}
              cx={1 + MORPH_DOT_PITCH * (cell % MORPH_GRID_SIZE)}
              cy={1 + MORPH_DOT_PITCH * Math.floor(cell / MORPH_GRID_SIZE)}
              r={MORPH_DOT_RADIUS}
              style={{ '--n': GENERIC_DOT_ORDER[cell] } as CSSProperties}
            />
          ))}
        </svg>
      </span>
    </span>
  );
};
