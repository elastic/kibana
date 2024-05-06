/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getYRange(chartData?: any[]) {
  const fit = false;

  if (chartData === undefined) {
    return { fit, min: NaN, max: NaN };
  }

  if (chartData.length === 0) {
    return { min: 0, max: 0, fit };
  }

  let max: number = Number.MIN_VALUE;
  let min: number = Number.MAX_VALUE;
  chartData.forEach((r: any) => {
    max = Math.max(r.value, max);
    min = Math.min(r.value, min);
  });

  const padding = (max - min) * 0.1;
  max += padding;
  min -= padding;

  return {
    min,
    max,
    fit,
  };
}

export function getXRange(lineChartData: any[]) {
  if (lineChartData.length === 0) {
    return { min: 0, max: 0 };
  }
  return {
    min: lineChartData[0].time,
    max: lineChartData[lineChartData.length - 1].time,
  };
}
