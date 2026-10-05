/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import { EuiIcon, useEuiTheme } from '@elastic/eui';

export type StepIconTone = 'primary' | 'danger' | 'warning' | 'accent' | 'success' | 'neutral';

/** A round, tinted icon marking one item on a timeline or trace. */
export const StepIcon: React.FC<{ iconType: IconType; tone: StepIconTone; label: string }> = ({
  iconType,
  tone,
  label,
}) => {
  const { euiTheme } = useEuiTheme();
  const { colors } = euiTheme;
  const { background, color } = {
    primary: { background: colors.backgroundLightPrimary, color: colors.textPrimary },
    danger: { background: colors.backgroundLightDanger, color: colors.textDanger },
    warning: { background: colors.backgroundLightWarning, color: colors.textWarning },
    accent: { background: colors.backgroundLightAccent, color: colors.textAccent },
    success: { background: colors.backgroundLightSuccess, color: colors.textSuccess },
    neutral: { background: colors.backgroundLightText, color: colors.textSubdued },
  }[tone];
  return (
    <span
      title={label}
      css={css`
        display: flex;
        align-items: center;
        justify-content: center;
        inline-size: ${euiTheme.size.xl};
        block-size: ${euiTheme.size.xl};
        border-radius: 50%;
        background: ${background};
      `}
    >
      <EuiIcon type={iconType} size="m" color={color} aria-label={label} />
    </span>
  );
};
