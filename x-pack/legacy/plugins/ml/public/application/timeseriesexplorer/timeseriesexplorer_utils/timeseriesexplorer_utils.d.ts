/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function createTimeSeriesJobData(jobs: any): any;

export function processMetricPlotResults(metricPlotData: any, modelPlotEnabled: any): any;

export function processForecastResults(forecastData: any): any;

export function processRecordScoreResults(scoreData: any): any;

export function processDataForFocusAnomalies(
  chartData: any,
  anomalyRecords: any,
  aggregationInterval: any,
  modelPlotEnabled: any
): any;

export function processScheduledEventsForChart(chartData: any, scheduledEvents: any): any;

export function findNearestChartPointToTime(chartData: any, time: any): any;

export function findChartPointForAnomalyTime(
  chartData: any,
  anomalyTime: any,
  aggregationInterval: any
): any;

export function calculateAggregationInterval(
  bounds: any,
  bucketsTarget: any,
  jobs: any,
  selectedJob: any
): any;

export function calculateDefaultFocusRange(
  autoZoomDuration: any,
  contextAggregationInterval: any,
  contextChartData: any,
  contextForecastData: any
): any;

export function calculateInitialFocusRange(
  zoomState: any,
  contextAggregationInterval: any,
  timefilter: any
): any;

export function getAutoZoomDuration(jobs: any, selectedJob: any): any;
