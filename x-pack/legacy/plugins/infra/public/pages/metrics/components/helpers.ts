/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactText } from 'react';
import Color from 'color';
import { get, first, last, min, max } from 'lodash';
import { createFormatter } from '../../../utils/formatters';
import { InfraDataSeries, InfraMetricData } from '../../../graphql/types';
import {
  InventoryVisTypeRT,
  InventoryFormatterType,
  InventoryVisType,
} from '../../../../common/inventory_models/types';
import { SeriesOverrides } from '../types';

/**
 * Returns a formatter
 */
export const getFormatter = (
  formatter: InventoryFormatterType = 'number',
  template: string = '{{value}}'
) => (val: ReactText) => (val != null ? createFormatter(formatter, template)(val) : '');

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
  const values = metric.series.reduce((acc, item) => {
    const firstRow = first(item.data);
    const lastRow = last(item.data);
    return acc.concat([(firstRow && firstRow.timestamp) || 0, (lastRow && lastRow.timestamp) || 0]);
  }, [] as number[]);
  return [min(values), max(values)];
};

/**
 * Returns the chart name from the visConfig based on the series id, otherwise it
 * just returns the seriesId
 */
export const getChartName = (
  seriesOverrides: SeriesOverrides | undefined,
  seriesId: string,
  label: string
) => {
  if (!seriesOverrides) {
    return label;
  }
  return get(seriesOverrides, [seriesId, 'name'], label);
};

/**
 * Returns the chart color from the visConfig based on the series id, otherwise it
 * just returns null if the color doesn't exists in the overrides.
 */
export const getChartColor = (seriesOverrides: SeriesOverrides | undefined, seriesId: string) => {
  const rawColor: string | null = seriesOverrides
    ? get(seriesOverrides, [seriesId, 'color'])
    : null;
  if (!rawColor) {
    return null;
  }
  const color = new Color(rawColor);
  return color.hex().toString();
};

/**
 * Gets the chart type based on the section and seriesId
 */
export const getChartType = (
  seriesOverrides: SeriesOverrides | undefined,
  type: InventoryVisType | undefined,
  seriesId: string
) => {
  if (!seriesOverrides || !type) {
    return 'line';
  }
  const overrideValue = get(seriesOverrides, [seriesId, 'type']);
  if (InventoryVisTypeRT.is(overrideValue)) {
    return overrideValue;
  }
  if (InventoryVisTypeRT.is(type)) {
    return type;
  }
  return 'line';
};
