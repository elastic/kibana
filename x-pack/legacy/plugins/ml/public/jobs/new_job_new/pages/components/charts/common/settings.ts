/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const LINE_COLOR = '#006BB4';
export const MODEL_COLOR = '#006BB4';

export interface ChartSettings {
  width: string;
  height: string;
  cols: 1 | 2 | 3;
  intervalMs: number;
}

export const defaultChartSettings: ChartSettings = {
  width: '100%',
  height: '300px',
  cols: 1,
  intervalMs: 0,
};

export const seriesStyle = {
  line: {
    stroke: '',
    strokeWidth: 2,
    visible: true,
    opacity: 1,
  },
  border: {
    visible: false,
    strokeWidth: 0,
    stroke: '',
  },
  point: {
    visible: false,
    radius: 2,
    stroke: '',
    strokeWidth: 4,
    opacity: 0.5,
  },
  area: {
    fill: '',
    opacity: 0.25,
    visible: false,
  },
};
