/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiBadge, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import type { QualityIndicators } from '../../../common/types';

export function QualityIndicator({
  quality,
  description,
}: {
  quality: QualityIndicators;
  description: string | ReactNode;
}) {
  const { euiTheme } = useEuiTheme();
  const qualityColors: Record<QualityIndicators, string> = {
    poor: euiTheme.colors.backgroundLightDanger,
    degraded: euiTheme.colors.backgroundLightWarning,
    good: euiTheme.colors.backgroundLightSuccess,
  };

  const qualityTextColors: Record<QualityIndicators, string> = {
    poor: euiTheme.colors.textDanger,
    degraded: euiTheme.colors.textWarning,
    good: euiTheme.colors.textSuccess,
  };

  const qualityIcons: Record<QualityIndicators, IconType> = {
    poor: 'error',
    degraded: 'warning',
    good: 'checkCircle',
  };

  const BadgeIconType = () => (
    <EuiIcon size="s" type={qualityIcons[quality]} color={qualityTextColors[quality]} />
  );

  return (
    <EuiBadge color={qualityColors[quality]} iconType={BadgeIconType}>
      <EuiText
        color={qualityTextColors[quality]}
        size="s"
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
      >
        {description}
      </EuiText>
    </EuiBadge>
  );
}
