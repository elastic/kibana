/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SVGProps } from 'react';
import { euiCanAnimate, useEuiTheme } from '@elastic/eui';
import { css, keyframes, type SerializedStyles } from '@emotion/react';

const CYCLE = '1.2s';
const CYCLE_MS = 1200;
const CORNERS = new Set([0, 3, 12, 15]);
/** Ring order from the Orbit variant: eight cells pulse one after another. */
const RING_ORDER = [1, 2, 7, 11, 14, 13, 8, 4];

type OrbitIconProps = SVGProps<SVGSVGElement> & {
  css?: SerializedStyles | SerializedStyles[];
};

/** Orbit dots sized by the parent icon, so an avatar can hold the smaller mark. */
export const OrbitAvatarIcon = ({ css: iconCss, ...props }: OrbitIconProps) => {
  const { euiTheme } = useEuiTheme();
  const rest = euiTheme.colors.lightShade;
  const peak = euiTheme.colors.textSubdued;
  const pulse = keyframes`
    0%, 45%, 100% { fill: ${rest}; }
    15% { fill: ${peak}; }
  `;

  const cells = [];
  for (let index = 0; index < 16; index++) {
    if (CORNERS.has(index)) {
      continue;
    }
    const ringIndex = RING_ORDER.indexOf(index);
    cells.push(
      <rect
        key={index}
        x={(index % 4) * 4}
        y={Math.floor(index / 4) * 4}
        width="2"
        height="2"
        className={ringIndex >= 0 ? 'ring' : undefined}
        style={
          ringIndex >= 0
            ? { animationDelay: `${Math.round((ringIndex * CYCLE_MS) / 8)}ms` }
            : undefined
        }
      />
    );
  }

  const incoming = iconCss == null ? [] : Array.isArray(iconCss) ? iconCss : [iconCss];

  return (
    <svg
      {...props}
      viewBox="0 0 14 14"
      data-variant="orbit"
      data-test-subj="agentBuilderOrbitDots"
      css={[
        ...incoming,
        css`
          rect {
            fill: ${rest};
          }
          ${euiCanAnimate} {
            rect.ring {
              animation: ${pulse} ${CYCLE} ease-in-out infinite;
            }
          }
        `,
      ]}
    >
      {cells}
    </svg>
  );
};
