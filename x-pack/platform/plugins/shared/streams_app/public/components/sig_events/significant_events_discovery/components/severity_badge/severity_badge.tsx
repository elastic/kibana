/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth, type EuiBadgeProps } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { type SeverityLevel, getSeverityLevel } from '@kbn/streams-schema';

export const SIGNIFICANT_EVENT_SEVERITY: Record<
  SeverityLevel,
  { color: EuiBadgeProps['color']; label: string; defaultValue: number }
> = {
  low: {
    color: '#5a6d8c',
    label: i18n.translate('xpack.streams.significantEventsTable.severityBadge.lowLabel', {
      defaultMessage: 'Low',
    }),
    defaultValue: 20,
  },
  medium: {
    color: '#facb3d',
    label: i18n.translate('xpack.streams.significantEventsTable.severityBadge.mediumLabel', {
      defaultMessage: 'Medium',
    }),
    defaultValue: 50,
  },
  high: {
    color: '#ed6723',
    label: i18n.translate('xpack.streams.significantEventsTable.severityBadge.highLabel', {
      defaultMessage: 'High',
    }),
    defaultValue: 70,
  },
  critical: {
    color: 'danger',
    label: i18n.translate('xpack.streams.significantEventsTable.severityBadge.criticalLabel', {
      defaultMessage: 'Critical',
    }),
    defaultValue: 90,
  },
};

export const scoreSeverity = (score: number): SeverityLevel => getSeverityLevel(score);

export function SeverityBadge({ score }: { score?: number }) {
  if (!score) {
    return (
      <EuiHealth color="text" style={{ lineHeight: 'inherit' }} textSize="xs">
        {i18n.translate('xpack.streams.significantEventsTable.severityBadge.noSeverity', {
          defaultMessage: 'None',
        })}
      </EuiHealth>
    );
  }
  const { color, label } = SIGNIFICANT_EVENT_SEVERITY[scoreSeverity(score)];
  return (
    <EuiHealth color={color} style={{ lineHeight: 'inherit' }} textSize="xs">
      {label}
    </EuiHealth>
  );
}
