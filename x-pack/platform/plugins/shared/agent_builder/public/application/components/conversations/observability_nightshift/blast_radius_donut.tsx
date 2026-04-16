/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export interface BlastRadiusDonutProps {
  /** Score from 0–100 */
  score: number;
  /** When true, ring uses danger styling (prototype: score above 80) */
  isCritical: boolean;
}

const SIZE_PX = 100;
const STROKE = 18;

export const BlastRadiusDonut: React.FC<BlastRadiusDonutProps> = ({ score, isCritical }) => {
  const { euiTheme } = useEuiTheme();

  const { radius, circumference, dashOffset, trackColor, arcColor, labelColor } = useMemo(() => {
    const r = (SIZE_PX - STROKE) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.min(100, Math.max(0, score));
    const offset = c * (1 - clamped / 100);
    const arc = isCritical ? euiTheme.colors.severity.danger : euiTheme.colors.severity.success;
    return {
      radius: r,
      circumference: c,
      dashOffset: offset,
      trackColor: euiTheme.colors.severity.unknown,
      arcColor: arc,
      labelColor: euiTheme.colors.vis.euiColorVisText7,
    };
  }, [
    euiTheme.colors.severity.danger,
    euiTheme.colors.severity.success,
    euiTheme.colors.severity.unknown,
    euiTheme.colors.vis.euiColorVisText7,
    isCritical,
    score,
  ]);

  const label = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.blastRadiusDonut.ariaLabel',
    {
      defaultMessage: 'Blast radius score {score} out of 100',
      values: { score },
    }
  );

  return (
    <div
      css={css`
        position: relative;
        width: ${SIZE_PX}px;
        height: ${SIZE_PX}px;
        flex-shrink: 0;
      `}
      role="img"
      aria-label={label}
    >
      <svg width={SIZE_PX} height={SIZE_PX} viewBox={`0 0 ${SIZE_PX} ${SIZE_PX}`} aria-hidden>
        <circle
          cx={SIZE_PX / 2}
          cy={SIZE_PX / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE_PX / 2}
          cy={SIZE_PX / 2}
          r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${SIZE_PX / 2} ${SIZE_PX / 2})`}
        />
      </svg>
      <div
        css={css`
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        `}
      >
        <span
          css={css`
            color: ${labelColor};
            font-family: ${euiTheme.font.familyCode};
            font-size: ${euiTheme.font.scale.xxl}rem;
            font-weight: ${euiTheme.font.weight.semiBold};
            line-height: 1;
          `}
        >
          {score}
        </span>
      </div>
    </div>
  );
};
