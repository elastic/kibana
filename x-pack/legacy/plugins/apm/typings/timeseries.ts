/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Coordinate {
  x: number;
  y: number | null | undefined;
}

export interface RectCoordinate {
  x: number;
  x0: number;
}

export interface TimeSeries {
  title: string;
  titleShort?: string;
  hideLegend?: boolean;
  hideTooltipValue?: boolean;
  data: Array<Coordinate | RectCoordinate>;
  legendValue?: string;
  type: string;
  color: string;
  areaColor?: string;
}

export type ChartType = 'area' | 'linemark';
export type YUnit = 'percent' | 'bytes' | 'number';
