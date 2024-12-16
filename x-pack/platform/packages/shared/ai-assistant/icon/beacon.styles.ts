/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AssistantBeaconProps } from './beacon';

/**
 * Returns contextually-relevant styles for the AI Assistant beacon.
 */
export const useStyles = ({
  backgroundColor = 'body',
  size: iconSize = 'xxl',
}: AssistantBeaconProps) => {
  const {
    euiTheme: { colors, size },
  } = useEuiTheme();

  const background = colors[backgroundColor];
  const rootSize = size[iconSize];

  const root = css`
    // Distance between the icon and the ring
    --ring-padding: ${Math.max(parseInt(rootSize, 10) / 2, parseInt(size.m, 10))}px;
    --ring-size: calc(${rootSize} + var(--ring-padding));

    // Size of the mask that hides the ring at frame 0
    --mask-point: calc(var(--ring-size) + 1px);

    // Overall size of the icon, given the animation doubles the
    // ring size at its end.
    --root-size: calc(var(--ring-size) * 2);

    background-color: ${background};
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: var(--root-size);
    height: var(--root-size);

    &:after {
      content: '';
      position: absolute;
      height: var(--mask-point);
      width: var(--mask-point);
      z-index: 2;
      border: 2px solid ${background};
      border-radius: 50%;
    }
  `;

  const rings = css`
    display: inline-block;
    position: absolute;
    height: var(--ring-size);
    width: var(--ring-size);

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
      width: var(--ring-size);
      height: var(--ring-size);
      top: 0;
      left: 0;
      z-index: 0;
      border: 1px solid ${colors.primary};
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
