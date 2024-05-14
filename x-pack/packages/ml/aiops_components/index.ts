/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { DualBrush, DualBrushAnnotation } from './src/dual_brush';
export { ProgressControls } from './src/progress_controls';
export {
  documentCountChartOverallSeriesName,
  DocumentCountChart,
  DocumentCountChartRedux,
  SimpleDocumentCountChart,
  DOCUMENT_COUNT_CHART_OVERALL_SERIES_SPEC_ID,
  getLogRateAnalysisBarStyleAccessor,
} from './src/document_count_chart';
export type {
  BrushSettings,
  BrushSelectionUpdateHandler,
  DocumentCountChartProps,
} from './src/document_count_chart';
