/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { $Values } from 'utility-types';
import { SignificantEventItem } from '../../hooks/use_fetch_significant_events';
import { pValueToLabel } from './p_value_to_label';

type EuiThemeColor = $Values<{
  [key in keyof EuiThemeComputed['colors']]: EuiThemeComputed['colors'][key] extends string
    ? key
    : never;
}>;

export interface FormattedChangePoint {
  time: number;
  impact: 'high' | 'medium' | 'low';
  p_value: number;
  type: 'dip' | 'distribution_change' | 'spike' | 'step_change' | 'trend_change';
  label: string;
  color: EuiThemeColor;
}

function getImpactProperties(impact: FormattedChangePoint['impact']): {
  color: EuiThemeColor;
  label: string;
} {
  if (impact === 'high') {
    return {
      color: 'danger',
      label: i18n.translate('xpack.significantEventsTable.changePoint.dotImpactHigh', {
        defaultMessage: 'High',
      }),
    };
  }

  if (impact === 'medium') {
    return {
      color: 'warning',
      label: i18n.translate('xpack.significantEventsTable.changePoint.dotImpactMedium', {
        defaultMessage: 'Medium',
      }),
    };
  }

  return {
    color: 'darkShade',
    label: i18n.translate('xpack.significantEventsTable.changePoint.dotImpactLow', {
      defaultMessage: 'Low',
    }),
  };
}

export function formatChangePoint(item: SignificantEventItem): FormattedChangePoint | undefined {
  const type = Object.keys(item.change_points.type)[0] as keyof typeof item.change_points.type;

  const isChange = type && type !== 'stationary' && type !== 'non_stationary';

  const point = item.change_points.type[type];

  const change =
    isChange && point
      ? {
          type,
          impact: pValueToLabel(point.p_value),
          time: item.occurrences[point.change_point].x,
          p_value: point.p_value,
        }
      : undefined;

  return change
    ? {
        ...change,
        ...getImpactProperties(change.impact),
      }
    : undefined;
}
