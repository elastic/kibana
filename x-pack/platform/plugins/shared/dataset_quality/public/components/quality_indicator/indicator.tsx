/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth, EuiText } from '@elastic/eui';
import React, { ReactNode } from 'react';
import type { QualityIndicators, InfoIndicators } from '../../../common/types';

export function QualityIndicator({
  quality,
  description,
  isColoredDescription,
  textSize = 's',
}: {
  quality: QualityIndicators;
  description: string | ReactNode;
  isColoredDescription?: boolean;
  textSize?: 'xs' | 's' | 'm';
}) {
  const qualityColors: Record<QualityIndicators, InfoIndicators> = {
    poor: 'danger',
    degraded: 'warning',
    good: 'success',
  };

  return (
    <EuiHealth color={qualityColors[quality]} textSize={textSize}>
      <EuiText size="relative" color={isColoredDescription ? qualityColors[quality] : 'white'}>
        {description}
      </EuiText>
    </EuiHealth>
  );
}
