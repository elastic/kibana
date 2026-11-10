/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { normalizeColor } from './src/colors';
export { compareCharts } from './src/compare';
export type { CompareOptions, Difference } from './src/compare';
export { normalizeDebugState } from './src/debug_state';
export { normalizeMetricReadings } from './src/metric_dom';
export { normalizeScene } from './src/scene';
export {
  normalizeBulletDebugState,
  normalizeDataGridReading,
  normalizeGaugeScene,
  normalizeHeatmapDebugState,
  normalizeHeatmapScene,
  normalizeLegacyMetricReadings,
  normalizeLegacyMetricScene,
  normalizePartitionDebugState,
  normalizePartitionScene,
  normalizeTableScene,
  normalizeTagCloudScene,
  normalizeWordReadings,
} from './src/records';
export type { DataGridReading, LegacyMetricTileReading } from './src/records';
export type {
  NormalizedAxis,
  NormalizedChart,
  NormalizedMetric,
  NormalizedRecord,
  NormalizedRecords,
  NormalizedSeries,
  NormalizedText,
  NormalizedTile,
  NormalizedXy,
  Point,
  RecordsKind,
} from './src/model';
export {
  GATE_FIXTURES_DIR,
  THEMES,
  kibanaChart,
  kibanaChartSize,
  kibanaTables,
  listGateCases,
} from './src/corpus';
export type {
  CaptureContext,
  CaptureRendering,
  GateCase,
  GateFixture,
  MetricReading,
  Theme,
} from './src/corpus';
export {
  EDGE_CASE_INDEX,
  EDGE_CASE_MAPPINGS,
  EDGE_CASE_TIME_RANGE,
  buildEdgeCaseDocuments,
} from './src/edge_case_data';
export type { EdgeCaseDocument } from './src/edge_case_data';
export { SAMPLE_DATA_SETS } from './src/sample_data_sets';
export { compareTables, datatableFromChartData } from './src/tables';
export { runGateAVisual } from './src/run';
export type { EngineOutput, GateAEngine, GateAVisualResult } from './src/run';
export { createElasticChartsHeadlessEngine, readMetricSvg, readWordsSvg } from './src/engine';
