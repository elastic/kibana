/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiBadge, EuiText } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import type { QualityIndicators, InfoIndicators } from '../../../common/types';

export function QualityIndicator({
  quality,
  description,
}: {
  quality: QualityIndicators;
  description: string | ReactNode;
}) {
  const qualityColors: Record<QualityIndicators, InfoIndicators> = {
    poor: 'danger',
    warning: 'warning',
    good: 'success',
  };

  const qualityIcons: Record<QualityIndicators, IconType> = {
    poor: 'error',
    warning: 'warning',
    good: 'checkCircle',
  };

  return (
    <EuiBadge color={qualityColors[quality]} iconType={qualityIcons[quality]}>
      <EuiText size="relative">{description}</EuiText>
    </EuiBadge>
  );
}
