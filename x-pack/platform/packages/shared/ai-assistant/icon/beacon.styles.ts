/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import type { AssistantBeaconProps } from './beacon';

export const useBeaconSize = (iconSize: AssistantBeaconProps['size'] = 'xxl') => {
  const {
    euiTheme: { size },
  } = useEuiTheme();

  // Size of the icon.
  const baseSize = parseInt(size[iconSize], 10);

  // Distance between the icon and the ring.
  const ringPadding = Math.max(baseSize / 2, parseInt(size.m, 10));

  // Overall size of the ring.
  const ringSize = baseSize + ringPadding;

  // Size of the mask that hides the ring at frame 0.
  const maskPoint = ringSize + 1;

  // Overall size of the icon, given the animation doubles the
  // ring size at its end.
  const rootSize = ringSize * 2;

  return { rootSize, ringSize, maskPoint };
};

/**
 * Returns contextually-relevant styles for the AI Assistant beacon.
 */
export const useStyles = ({
  backgroundColor = 'body',
  size: iconSize = 'xxl',
  ringsColor,
}: AssistantBeaconProps) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  const { maskPoint, ringSize, rootSize } = useBeaconSize(iconSize);

  const background = colors[backgroundColor];

  const root = css`
    background-color: ${background};
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: ${rootSize}px;
    height: ${rootSize}px;

    &:after {
      content: '';
      position: absolute;
      height: ${maskPoint}px;
      width: ${maskPoint}px;
      z-index: 2;
      border: 2px solid ${background};
      border-radius: 50%;
    }
  `;

  const rings = css`
    display: inline-block;
    position: absolute;
    height: ${ringSize}px;
    width: ${ringSize}px;

    @keyframes outer {
      0% {
        opacity: 1;
        transform: scaleY(1) scaleX(1);
      }
      20% {
        opacity: 0.5;
      }
      70% {
        opacity: 0.2;
        transform: scaleY(2) scaleX(2);
      }
      80% {
        opacity: 0;
        transform: scaleY(2) scaleX(2);
      }
      90% {
        opacity: 0;
        transform: scaleY(1) scaleX(1);
      }
    }

    @keyframes inner {
      0% {
        opacity: 1;
        transform: scaleY(1) scaleX(1);
      }
      15% {
        opacity: 1;
        transform: scaleY(1) scaleX(1);
      }
      40% {
        opacity: 0.5;
      }
      70% {
        opacity: 0.2;
        transform: scaleY(1.5) scaleX(1.5);
      }
      80% {
        opacity: 0;
        transform: scaleY(1.5) scaleX(1.5);
      }
      90% {
        opacity: 0;
        transform: scaleY(1) scaleX(1);
      }
    }

    &:before,
    &:after {
      content: '';
      position: absolute;
      width: ${ringSize}px;
      height: ${ringSize}px;
      top: 0;
      left: 0;
      z-index: 0;
      border: 1px solid ${ringsColor ?? colors.primary};
      border-radius: 50%;
      animation: 4s cubic-bezier(0.42, 0, 0.37, 1) 0.5s infinite normal none running;
    }

    &:before {
      animation-name: inner;
    }

    &:after {
      animation-name: outer;
    }
  `;

  return {
    root,
    rings,
  };
};
