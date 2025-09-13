/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import { useEuiTheme, EuiBadge, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { QualityIndicators } from '@kbn/data-quality/common';

export const DataQualityBadge = ({ quality }: { quality: QualityIndicators }) => {
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

  const qualityTexts: Record<QualityIndicators, string> = {
    poor: i18n.translate('xpack.streams.dataQualityBadge.poor', { defaultMessage: 'Poor' }),
    degraded: i18n.translate('xpack.streams.dataQualityBadge.degraded', { defaultMessage: 'Degraded' }),
    good: i18n.translate('xpack.streams.dataQualityBadge.good', { defaultMessage: 'Good' }),
  };

  return (
    <EuiBadge color={qualityColors[quality]} iconType={qualityIcons[quality]}>
      <EuiText color={qualityTextColors[quality]} size="relative">
        {qualityTexts[quality]}
      </EuiText>
    </EuiBadge>
  );
};
