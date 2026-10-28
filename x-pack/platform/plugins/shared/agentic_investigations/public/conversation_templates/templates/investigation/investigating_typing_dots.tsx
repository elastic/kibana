/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';

const DOT_DELAYS_MS = [0, 150, 300] as const;
const DOT_SIZE_PX = 3;

const typingDotPulse = keyframes`
  0%, 80%, 100% {
    opacity: 0.25;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-1px);
  }
`;

export interface InvestigatingTypingDotsProps {
  /** CSS color or gradient fill for the dots. Defaults to currentColor. */
  color?: string;
}

/** Staggered typing-style dots used next to in-progress investigation status. */
export const InvestigatingTypingDots = ({
  color = 'currentColor',
}: InvestigatingTypingDotsProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      aria-hidden
      data-test-subj="investigationCardRunningDots"
      css={css`
        display: inline-flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
        line-height: 1;
        padding-block: 1px;

        @media (prefers-reduced-motion: reduce) {
          span {
            animation: none;
            opacity: 0.7;
            transform: none;
          }
        }
      `}
    >
      {DOT_DELAYS_MS.map((delayMs) => (
        <span
          key={delayMs}
          css={css`
            width: ${DOT_SIZE_PX}px;
            height: ${DOT_SIZE_PX}px;
            border-radius: 50%;
            background: ${color};
            animation: ${typingDotPulse} 1.2s ${euiTheme.animation.resistance} infinite;
            animation-delay: ${delayMs}ms;
          `}
        />
      ))}
    </span>
  );
};
