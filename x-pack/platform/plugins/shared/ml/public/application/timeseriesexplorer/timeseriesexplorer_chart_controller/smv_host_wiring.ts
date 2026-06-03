/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Duration } from 'moment';
import moment from 'moment';
import type { Moment } from 'moment';
import { forkJoin, type Observable, type Subject, type Subscription } from 'rxjs';

import { i18n } from '@kbn/i18n';

import {
  createContextChartZoomSubscription,
  type ContextChartSelection,
  type ContextChartZoomChartState,
} from './context_chart_zoom_pipeline';
import type { LoadSingleMetricContextDataSuccess } from './load_single_metric_context_data';

/**
 * Shared i18n keys for `loadSingleMetricContextData` error toasts (full-page SMV + embeddable chart).
 */
export function getSmvContextLoadErrorMessages(selectedForecastId: string | undefined) {
  return {
    metric: i18n.translate('xpack.ml.timeSeriesExplorer.metricDataErrorMessage', {
      defaultMessage: 'Error getting metric data',
    }),
    swimlane: i18n.translate('xpack.ml.timeSeriesExplorer.bucketAnomalyScoresErrorMessage', {
      defaultMessage: 'Error getting bucket anomaly scores',
    }),
    entityCounts: i18n.translate('xpack.ml.timeSeriesExplorer.entityCountsErrorMessage', {
      defaultMessage: 'Error getting entity counts',
    }),
    forecast: i18n.translate('xpack.ml.timeSeriesExplorer.forecastDataErrorMessage', {
      defaultMessage: 'Error loading forecast data for forecast ID {forecastId}',
      values: { forecastId: selectedForecastId },
    }),
  };
}

export interface ConsumeSmvContextLoadResultOptions {
  result: LoadSingleMetricContextDataSuccess | null;
  isUnmounted: () => boolean;
  loadCounterWhenStarted: number;
  readLoadCounter: () => number;
  /** Called when the loader requests syncing the “previous forecast” marker from current props. */
  syncPreviousSelectedForecastIdFromProps: () => void;
  /** Invoked when `zoomSelection` is returned (hosts typically forward to `contextChartSelected`). */
  applyZoomSelection?: (range: { from: Date; to: Date }) => void;
  applyStatePatch: (patch: Record<string, unknown>) => void;
  /** e.g. embeddable `onRenderComplete` when chartable */
  afterStatePatch?: (patch: Record<string, unknown>) => void;
}

/**
 * Shared `.then` handling for `loadSingleMetricContextData` (stale guard + zoom + state).
 */
export function consumeSmvContextLoadResult(options: ConsumeSmvContextLoadResultOptions): void {
  const {
    result,
    isUnmounted,
    loadCounterWhenStarted,
    readLoadCounter,
    syncPreviousSelectedForecastIdFromProps,
    applyZoomSelection,
    applyStatePatch,
    afterStatePatch,
  } = options;

  if (isUnmounted()) {
    return;
  }
  if (result === null) {
    return;
  }
  if (loadCounterWhenStarted !== readLoadCounter()) {
    return;
  }

  const { statePatch, zoomSelection, shouldUpdatePreviousSelectedForecastId } = result;
  if (shouldUpdatePreviousSelectedForecastId) {
    syncPreviousSelectedForecastIdFromProps();
  }
  if (zoomSelection !== undefined) {
    applyZoomSelection?.(zoomSelection);
  }
  applyStatePatch(statePatch);
  afterStatePatch?.(statePatch);
}

export interface SmvBrushToFocusZoomHost {
  includeAnomaliesTable: boolean;
  isBrushFocusInitPending: () => boolean;
  markBrushFocusInitHandled: () => void;
  onBrushPreview: (selection: ContextChartSelection) => void;
  readChartZoomState: () => ContextChartZoomChartState;
  onFocusPipelineStarting: () => void;
  getFocusAggregationInterval: (selection: ContextChartSelection) => Duration;
  getBoundsRoundedToInterval: (
    bounds: { min: Moment; max: Moment },
    interval: Duration,
    inclusiveEnd?: boolean
  ) => { min: Moment; max: Moment };
  getFocusData$: (selection: ContextChartSelection) => Observable<unknown> | undefined;
  getAnomaliesTableForRange$: (earliestMs: number, latestMs: number) => Observable<unknown>;
  readModelPlotEnabled: () => boolean;
  readSelectedForecastId: () => string | undefined;
  applyFocusPipelinePatch: (patch: Record<string, unknown>) => void;
}

function buildSmvFocusPipelineStatePatch(args: {
  selection: ContextChartSelection;
  modelPlotEnabled: boolean;
  selectedForecastId: string | undefined;
  refreshFocusData: Record<string, unknown>;
  tableData: Record<string, unknown> | undefined;
  getFocusAggregationInterval: (selection: ContextChartSelection) => Duration;
}): Record<string, unknown> {
  const {
    selection,
    modelPlotEnabled,
    selectedForecastId,
    refreshFocusData,
    tableData,
    getFocusAggregationInterval,
  } = args;

  const focusChartData = refreshFocusData.focusChartData;
  const focusChartLength = Array.isArray(focusChartData) ? focusChartData.length : 0;

  return {
    ...refreshFocusData,
    ...(tableData ?? {}),
    focusAggregationInterval: getFocusAggregationInterval(selection),
    loading: false,
    showModelBoundsCheckbox: modelPlotEnabled && focusChartLength > 0,
    zoomFromFocusLoaded: selection.from,
    zoomToFocusLoaded: selection.to,
    showForecastCheckbox: Boolean(selectedForecastId && refreshFocusData.showForecastCheckbox),
  };
}

/**
 * Shared brush → debounced focus (+ optional anomalies table) pipeline for SMV page + embeddable chart.
 */
export function subscribeSmvBrushToFocusZoom(
  contextChart$: Subject<ContextChartSelection>,
  host: SmvBrushToFocusZoomHost
): Subscription {
  return createContextChartZoomSubscription(contextChart$, {
    includeAnomaliesTable: host.includeAnomaliesTable,
    onZoomPreview: (selection) => host.onBrushPreview(selection),
    getChartState: () => host.readChartZoomState(),
    shouldTriggerFocusLoad: (selection, state) =>
      (host.isBrushFocusInitPending() && state.focusChartData === undefined) ||
      (state.zoomFromFocusLoaded != null &&
        state.zoomToFocusLoaded != null &&
        (state.zoomFromFocusLoaded.getTime() !== selection.from.getTime() ||
          state.zoomToFocusLoaded.getTime() !== selection.to.getTime())),
    onFocusLoadInit: () => host.markBrushFocusInitHandled(),
    onFocusLoadStart: () => host.onFocusPipelineStarting(),
    getFocusPipeline$: (selection) => {
      const bounds = { min: moment(selection.from), max: moment(selection.to) };
      const focusAggregationInterval = host.getFocusAggregationInterval(selection);
      const searchBounds = host.getBoundsRoundedToInterval(bounds, focusAggregationInterval, false);
      const focusData$ = host.getFocusData$(selection);
      if (focusData$ === undefined) {
        return null;
      }
      if (host.includeAnomaliesTable === false) {
        return focusData$;
      }
      return forkJoin([
        focusData$,
        host.getAnomaliesTableForRange$(searchBounds.min.valueOf(), searchBounds.max.valueOf()),
      ]);
    },
    onFocusPipelineResult: ([refreshFocusData, tableData], selection) => {
      host.applyFocusPipelinePatch(
        buildSmvFocusPipelineStatePatch({
          selection,
          modelPlotEnabled: host.readModelPlotEnabled(),
          selectedForecastId: host.readSelectedForecastId(),
          refreshFocusData: refreshFocusData as Record<string, unknown>,
          tableData: tableData as Record<string, unknown> | undefined,
          getFocusAggregationInterval: host.getFocusAggregationInterval,
        })
      );
    },
  });
}
