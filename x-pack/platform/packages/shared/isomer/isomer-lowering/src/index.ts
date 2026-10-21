/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type Dimension,
  type PlannedDashboard,
  type PlannedPanel,
  type PlannedVegaPanel,
  type TimeRange,
  planDashboard,
} from './dashboard';
export {
  type EsqlResponse,
  type ExecuteEsql,
  type ExecuteSearch,
  formatValue,
} from './esql_response';
export {
  type ChartPanelReport,
  type ChartsDashboard,
  type PanelOutcome,
  bindChartsDashboard,
} from './bind_charts';
export type { ChartSelection, SelectionPredicate } from './selection';
export { injectWhere, predicateToEsql, selectionsToEsql } from './esql';
export {
  type KibanaEsUrl,
  type VegaMode,
  type VegaSource,
  type VegaSpec,
  inlineVegaData,
  isKibanaMap,
  kibanaMapToVega,
  kibanaSearchBody,
  parseKibanaVegaSpec,
  selectionsToDsl,
  vegaSources,
} from './vega';
export {
  type ConvertDashboardOptions,
  type ConvertedDashboard,
  type ConvertedPanel,
  convertDashboard,
} from './convert';
export { type BoundPanel, bindVegaPanels } from './vega_panels';
export {
  basemapId,
  bindMapPanels,
  dataViewResolver,
  type LoweredMap,
  lowerMap,
  type LowerMapOptions,
  type MapLoweringOptions,
  type MapDataView,
  type MapPanelState,
  type MapServices,
} from './map_panels';
export { engineHintFromLens } from './engine_hints';
export {
  type DashboardContext,
  type EsqlVariable,
  type PinnedControl,
  type ResolveField,
  type ResolvedField,
  buildDashboardContext,
  readPinnedControls,
  readSavedContext,
  withCurrentControls,
} from './dashboard_context';
export type { EsqlRequestOptions } from './esql_response';
export type { DashboardBool } from './vega';
