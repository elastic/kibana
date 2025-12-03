/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, type EuiBadgeProps } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

type Severity = 'low' | 'medium' | 'high' | 'critical';

const SEVERITY_COLORS: Record<Severity, { color: EuiBadgeProps['color']; label: string }> = {
  low: {
    color: 'default',
    label: i18n.translate('xpack.streams.significantEventsTable.severityBadge.lowLabel', {
      defaultMessage: 'Low',
    }),
  },
  medium: {
    color: 'warning',
    label: i18n.translate('xpack.streams.significantEventsTable.severityBadge.mediumLabel', {
      defaultMessage: 'Medium',
    }),
  },
  high: {
    color: '#FFA500',
    label: i18n.translate('xpack.streams.significantEventsTable.severityBadge.highLabel', {
      defaultMessage: 'High',
    }),
  },
  critical: {
    color: 'danger',
    label: i18n.translate('xpack.streams.significantEventsTable.severityBadge.criticalLabel', {
      defaultMessage: 'Critical',
    }),
  },
};

const scoreSeverity = (score: number): Severity => {
  if (score < 40) {
    return 'low';
  } else if (score < 60) {
    return 'medium';
  } else if (score < 80) {
    return 'high';
  }
  return 'critical';
};

export function SeverityBadge({ score }: { score?: number }) {
  if (!score) {
    return <EuiBadge color="hollow">-</EuiBadge>;
  }
  const { color, label } = SEVERITY_COLORS[scoreSeverity(score)];
  return <EuiBadge color={color}>{label}</EuiBadge>;
}
