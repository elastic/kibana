/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { SAMPLE_DATA_SETS } from './src/sample_data_sets';
export type { SampleDataSetId } from './src/sample_data_sets';
export {
  EDGE_CASE_CATEGORIES,
  EDGE_CASE_INDEX,
  EDGE_CASE_LONG_LABELS,
  EDGE_CASE_MAPPINGS,
  EDGE_CASE_TAGS,
  EDGE_CASE_TIME_FIELD,
  EDGE_CASE_TIME_RANGE,
  buildEdgeCaseDocuments,
} from './src/edge_case_data';
export type { EdgeCaseDocument } from './src/edge_case_data';
export { EDGE_CASE_DASHBOARDS, toDashboardRequestBody } from './src/edge_case_dashboards';
export type { EdgeCase, EdgeCaseDashboard, EdgeCasePanel } from './src/edge_case_dashboards';
export { flattenAsCodePanels, getVisualizationRefId, withoutVolatileMeta } from './src/as_code';
export type { AsCodePanel, AsCodePanelEntry } from './src/as_code';
export { DEFAULT_TIME_RANGE, resolveTimeRange, toGlobalStateQuery } from './src/time_context';
export type { TimeRange } from './src/time_context';
export {
  THEMES,
  capturePaths,
  createCaptureWriter,
  toPathSegment,
  toStableJson,
} from './src/capture_writer';
export type { CaptureWriter, Theme } from './src/capture_writer';
export { cropScreenshot } from './src/screenshot';
export type { CssRect } from './src/screenshot';
export {
  allChartsHaveDebugState,
  centerPanel,
  listRenderedPanelIds,
  readInspectorTables,
  readPanel,
  readRenderContext,
} from './src/browser_readers';
export type {
  ChartReading,
  DataGridCellReading,
  DataGridReading,
  DomTextReading,
  MetricReading,
  PanelPlacement,
  PanelReading,
  RenderContextReading,
} from './src/browser_readers';
export {
  diffJson,
  diffLensAttributes,
  getLensIdAliases,
  replaceIds,
  toFieldPattern,
} from './src/round_trip';
export type { JsonDifference } from './src/round_trip';
export { renderRoundTripReport } from './src/round_trip_report';
export type { RoundTripDashboardResult, RoundTripPanelResult } from './src/round_trip_report';
export {
  REVIEW_FORMAT,
  toExpectedChart,
  toExpectedStrings,
  toHexColor,
  toVisibleText,
} from './src/review_export';
export type {
  ExpectedAxis,
  ExpectedChart,
  ExpectedStrings,
  ExpectedText,
  PanelCapture,
} from './src/review_export';
export { exportReview } from './src/export_review';
export type { ReviewCase, ReviewIndex } from './src/export_review';
