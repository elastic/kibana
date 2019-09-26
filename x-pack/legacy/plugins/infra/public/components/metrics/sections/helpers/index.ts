/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactText } from 'react';
import Color from 'color';
import { get, first, last, min, max } from 'lodash';
import { InfraFormatterType } from '../../../../lib/lib';
import { createFormatter } from '../../../../utils/formatters';
import { InfraDataSeries, InfraMetricData } from '../../../../graphql/types';
import {
  InfraMetricLayoutVisualizationType,
  InfraMetricLayoutSection,
} from '../../../../pages/metrics/layouts/types';

/**
 * Returns a formatter
 */
export const getFormatter = (formatter: InfraFormatterType, template: string) => (val: ReactText) =>
  val != null ? createFormatter(formatter, template)(val) : '';

/**
 * Does a series have more then two points?
 */
export const seriesHasLessThen2DataPoints = (series: InfraDataSeries): boolean => {
  return series.data.length < 2;
};

/**
 * Returns the minimum and maximum timestamp for a metric
 */
export const getMaxMinTimestamp = (metric: InfraMetricData): [number, number] => {
  if (metric.series.some(seriesHasLessThen2DataPoints)) {
    return [0, 0];
  }
  const values = metric.series.reduce(
    (acc, item) => {
      const firstRow = first(item.data);
      const lastRow = last(item.data);
      return acc.concat([
        (firstRow && firstRow.timestamp) || 0,
        (lastRow && lastRow.timestamp) || 0,
      ]);
    },
    [] as number[]
  );
  return [min(values), max(values)];
};

/**
 * Returns the chart name from the visConfig based on the series id, otherwise it
 * just returns the seriesId
 */
export const getChartName = (
  section: InfraMetricLayoutSection,
  seriesId: string,
  label: string
) => {
  return get(section, ['visConfig', 'seriesOverrides', seriesId, 'name'], label);
};

/**
 * Returns the chart color from the visConfig based on the series id, otherwise it
 * just returns null if the color doesn't exists in the overrides.
 */
export const getChartColor = (section: InfraMetricLayoutSection, seriesId: string) => {
  const rawColor: string | null = get(section, ['visConfig', 'seriesOverrides', seriesId, 'color']);
  if (!rawColor) {
    return null;
  }
  const color = new Color(rawColor);
  return color.hex().toString();
};

/**
 * Type guard for InfraMetricLayoutVisualizationType
 */
const isInfraMetricLayoutVisualizationType = (
  subject: any
): subject is InfraMetricLayoutVisualizationType => {
  return InfraMetricLayoutVisualizationType[subject] != null;
};

/**
 * Gets the chart type based on the section and seriesId
 */
export const getChartType = (section: InfraMetricLayoutSection, seriesId: string) => {
  const value = get(section, ['visConfig', 'type']);
  const overrideValue = get(section, ['visConfig', 'seriesOverrides', seriesId, 'type']);
  if (isInfraMetricLayoutVisualizationType(overrideValue)) {
    return overrideValue;
  }
  if (isInfraMetricLayoutVisualizationType(value)) {
    return value;
  }
  return InfraMetricLayoutVisualizationType.line;
};
