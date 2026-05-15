/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function MockAwsStreamQualityBadge({ quality }: { quality: 'good' | 'degraded' | 'poor' }) {
  const { euiTheme } = useEuiTheme();

  const bgColor = {
    good: euiTheme.colors.backgroundLightSuccess,
    degraded: euiTheme.colors.backgroundLightWarning,
    poor: euiTheme.colors.backgroundLightDanger,
  }[quality];

  const textColor = {
    good: euiTheme.colors.textSuccess,
    degraded: euiTheme.colors.textWarning,
    poor: euiTheme.colors.textDanger,
  }[quality];

  const iconType = { good: 'checkCircle', degraded: 'warning', poor: 'error' }[quality];
  const label = {
    good: i18n.translate('xpack.streams.mockStreamsTable.qualityGood', {
      defaultMessage: 'Good',
    }),
    degraded: i18n.translate('xpack.streams.mockStreamsTable.qualityDegraded', {
      defaultMessage: 'Degraded',
    }),
    poor: i18n.translate('xpack.streams.mockStreamsTable.qualityPoor', {
      defaultMessage: 'Poor',
    }),
  }[quality];

  const BadgeIcon = () => <EuiIcon size="s" type={iconType} color={textColor} aria-hidden={true} />;

  return (
    <EuiBadge color={bgColor} iconType={BadgeIcon}>
      <EuiText color={textColor} size="xs" style={{ marginLeft: '4px' }}>
        {label}
      </EuiText>
    </EuiBadge>
  );
}
