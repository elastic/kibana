/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Duration } from 'moment';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';

export interface TimeSeriesExplorerZoomState {
  from: string;
  to: string;
}

export interface ResolveContextFinishFocusRangeParams {
  zoom: TimeSeriesExplorerZoomState | undefined;
  contextAggregationInterval: Duration;
  bounds: TimeRangeBounds;
  selectedForecastId: string | undefined;
  previousSelectedForecastId: string | undefined;
  autoZoomDuration: number;
  contextChartData: unknown[];
  contextForecastData: unknown[] | undefined;
  calculateInitialFocusRange: (
    zoom: TimeSeriesExplorerZoomState | undefined,
    contextAggregationInterval: Duration,
    bounds: TimeRangeBounds
  ) => [Date, Date] | undefined;
  calculateDefaultFocusRange: (
    autoZoomDuration: number,
    contextAggregationInterval: Duration,
    contextChartData: unknown[],
    contextForecastData: unknown[] | undefined
  ) => [Date, Date] | undefined;
}

export interface ResolveContextFinishFocusRangeResult {
  focusRange: [Date, Date] | undefined;
  /** When true, callers should set previousSelectedForecastId = selectedForecastId (legacy finish() side effect). */
  shouldUpdatePreviousSelectedForecastId: boolean;
}

/**
 * Single merged rule for initial brush range after context chart data loads (finish()).
 * See refactor plan: parity item 4.
 */
export function resolveContextFinishFocusRange(
  params: ResolveContextFinishFocusRangeParams
): ResolveContextFinishFocusRangeResult {
  const focusRangeFromUrl = params.calculateInitialFocusRange(
    params.zoom,
    params.contextAggregationInterval,
    params.bounds
  );

  // Only treat forecast as "changed" once we have a prior value (e.g. user switched forecast).
  // On first load / full refresh, `previousSelectedForecastId` is unset while URL may still carry
  // `selectedForecastId` — comparing to undefined would incorrectly force default zoom and drop URL brush.
  const forecastChanged =
    params.previousSelectedForecastId !== undefined &&
    params.selectedForecastId !== params.previousSelectedForecastId;

  const useDefaultFocusRange =
    params.zoom === undefined || focusRangeFromUrl === undefined || forecastChanged;

  if (!useDefaultFocusRange) {
    return {
      focusRange: focusRangeFromUrl,
      shouldUpdatePreviousSelectedForecastId: false,
    };
  }

  const defaultRange = params.calculateDefaultFocusRange(
    params.autoZoomDuration,
    params.contextAggregationInterval,
    params.contextChartData,
    params.contextForecastData
  );

  return {
    focusRange: defaultRange,
    shouldUpdatePreviousSelectedForecastId: true,
  };
}
