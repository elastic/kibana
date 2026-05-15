/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ## Single Metric Viewer chart controller (public integration surface)
 *
 * Hosts embedding the time-series / SMV chart should prefer imports from this module
 * instead of deep imports from `timeseriesexplorer.js`.
 *
 * **Required services (typical):**
 * - `mlApi` (including `mlApi.results`)
 * - `mlResultsService` / `mlTimeSeriesSearchService` / `timeSeriesExplorerService` factories
 * - `uiSettings` for `timeBucketsServiceFactory(uiSettings).getBoundsRoundedToInterval`
 * - Optional: `toastNotificationService`, `mlFieldFormatService.populateFormats`, job list hydration (`loadJobsWrapper`) when using `AnomaliesTable` / `LinksMenu`
 *
 * **Host inputs:** job (or job id + loaded job), `detectorIndex`, `selectedEntities`, optional `functionDescription`, optional `forecastId`, time `bounds`, brush `zoom` ownership (URL vs local).
 *
 * **`includeAnomaliesTable`:** when false, skip **all** `loadAnomaliesTableData` paths (zoom pipeline and interval/severity listeners on the full page). `createContextChartZoomSubscription` merges a synthetic empty table payload when `getFocusPipeline$` returns **focus only** (no `forkJoin` with a dummy observable required).
 *
 * **Telemetry:** pass distinct `telemetrySource` strings into `TimeSeriesChartWithTooltips` for analytics.
 *
 * **Layout:** `SingleMetricViewerChartSurface` wraps dashboard SMV (`TimeSeriesExplorerEmbeddableChart`) and full-page SMV (`TimeSeriesExplorer`); use `children` for the main stack (e.g. `SeriesControls`, loading, chart, tables) and `controlsSlot` for optional leading chrome (embeddable uses a spacer there).
 *
 * **FTR / regression (requires live ES + Kibana):** from repo root, with the usual FTR bootstrap, run for example:
 * - `node scripts/functional_test_runner --config=x-pack/platform/test/functional/apps/ml/anomaly_detection_result_views/config.ts` (includes `single_metric_viewer.ts`)
 * - `node scripts/functional_test_runner --config=x-pack/platform/test/functional/apps/ml/anomaly_detection_integrations/config.ts` (includes `single_metric_viewer_dashboard_embeddables.ts`)
 */

export {
  applySmvTableFilter,
  buildCriteriaFields,
  type SmvEntityControl,
} from './entity_partition_helpers';
export { normalizeSeverityThresholdForApi } from './normalize_table_severity';
export {
  fetchAnomaliesTableData$,
  type FetchAnomaliesTableDataParams,
} from './anomalies_table_data';
export {
  resolveContextFinishFocusRange,
  type ResolveContextFinishFocusRangeParams,
  type ResolveContextFinishFocusRangeResult,
  type TimeSeriesExplorerZoomState,
} from './resolve_context_finish_focus_range';
export {
  createContextChartZoomSubscription,
  type ContextChartSelection,
  type ContextChartZoomChartState,
  type ContextChartZoomHandlers,
} from './context_chart_zoom_pipeline';
export {
  getForecastAggTypeForContextLoad,
  getModelPlotEnabledForDetector,
  loadSingleMetricContextData,
  type LoadSingleMetricContextDataDeps,
  type LoadSingleMetricContextDataParams,
  type LoadSingleMetricContextDataSuccess,
} from './load_single_metric_context_data';
export { PartitionFieldsRequiredCallout } from './partition_fields_required_callout';
export { SingleMetricViewerChartSurface } from './single_metric_viewer_chart_surface';
export { useSingleMetricViewerChartModel } from './use_single_metric_viewer_chart_model';
export {
  consumeSmvContextLoadResult,
  getSmvContextLoadErrorMessages,
  subscribeSmvBrushToFocusZoom,
  type ConsumeSmvContextLoadResultOptions,
  type SmvBrushToFocusZoomHost,
} from './smv_host_wiring';
export {
  getSmvDataReloadPlan,
  smvReloadSnapshotFromSmvHostProps,
  type SmvDataReloadPlan,
  type SmvDataReloadSnapshot,
  type SmvReloadHostPropsInput,
} from './smv_data_reload_plan';
