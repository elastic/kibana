/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql } from '@kbn/streams-schema';
import type { $Values } from 'utility-types';
import type { SignificantEventItem } from '../../../hooks/use_fetch_significant_events';
import { pValueToLabel } from './p_value_to_label';

type EuiThemeColor = $Values<{
  [key in keyof EuiThemeComputed['colors']]: EuiThemeComputed['colors'][key] extends string
    ? key
    : never;
}>;

export interface FormattedChangePoint {
  query: StreamQueryKql;
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
      label: i18n.translate('xpack.streams.significantEventsTable.changePoint.dotImpactHigh', {
        defaultMessage: 'High',
      }),
    };
  }

  if (impact === 'medium') {
    return {
      color: 'warning',
      label: i18n.translate('xpack.streams.significantEventsTable.changePoint.dotImpactMedium', {
        defaultMessage: 'Medium',
      }),
    };
  }

  return {
    color: 'darkShade',
    label: i18n.translate('xpack.streams.significantEventsTable.changePoint.dotImpactLow', {
      defaultMessage: 'Low',
    }),
  };
}

export function formatChangePoint(
  item: Omit<SignificantEventItem, 'stream_name'>
): FormattedChangePoint | undefined {
  const type = Object.keys(item.change_points.type)[0] as keyof typeof item.change_points.type;

  const isChange = type && type !== 'stationary' && type !== 'non_stationary';

  const point = item.change_points.type[type];

  const pValue = point?.p_value;
  const changePoint = point?.change_point;

  const change =
    isChange && point && pValue !== undefined && changePoint !== undefined
      ? {
          type,
          impact: pValueToLabel(pValue),
          time: item.occurrences[changePoint].x,
          p_value: pValue,
        }
      : undefined;

  return change
    ? {
        ...change,
        ...getImpactProperties(change.impact),
        query: item.query,
      }
    : undefined;
}
