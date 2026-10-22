/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasourceStates, IndexPatternMap, MetricVisualizationState } from '@kbn/lens-common';
import { LENS_METRIC_ID } from '@kbn/lens-common';
import { hydrateTextBasedLayerTimeFields } from '../datasources/text_based/hydrate_time_field';
import { hydrateEsqlMetricTrendline } from '../visualizations/metric/state_hydration/esql_trendline';
import { isMetricVisualizationState } from '../visualizations/metric/state_hydration/is_metric_state';
import { hydrateLegacySecondaryLabel } from '../visualizations/metric/state_hydration/legacy_secondary_label';
import type { StateHydration, StateHydrationContext, StateHydrationResult } from './types';

/** Lens editor load and save. */
const metricEditorHydrations: Array<StateHydration<MetricVisualizationState>> = [
  hydrateLegacySecondaryLabel,
  hydrateEsqlMetricTrendline,
];

/** Dashboard panel render (`persistedStateToExpression`). */
const metricExpressionHydrations: Array<StateHydration<MetricVisualizationState>> = [
  hydrateEsqlMetricTrendline,
];

function runHydrations<T>(
  visualizationState: T,
  datasourceStates: DatasourceStates,
  hydrations: ReadonlyArray<StateHydration<T>>
): StateHydrationResult<T> {
  let result: StateHydrationResult<T> = { visualizationState, datasourceStates };
  for (const hydration of hydrations) {
    result = hydration(result.visualizationState, result.datasourceStates);
  }
  return result;
}

/**
 * Fills datasource layers from indexPatterns, then type-guards visualization
 * state and runs that chart type's hydrations for `context`.
 */
export function applyStateHydration({
  visualizationId,
  visualizationState,
  datasourceStates,
  context,
  indexPatterns,
}: {
  visualizationId: string | null | undefined;
  visualizationState: unknown;
  datasourceStates: DatasourceStates;
  context: StateHydrationContext;
  indexPatterns?: IndexPatternMap;
}): StateHydrationResult {
  const nextDatasourceStates = indexPatterns
    ? hydrateTextBasedLayerTimeFields(datasourceStates, indexPatterns)
    : datasourceStates;

  if (visualizationId === LENS_METRIC_ID && isMetricVisualizationState(visualizationState)) {
    return runHydrations(
      visualizationState,
      nextDatasourceStates,
      context === 'editor' ? metricEditorHydrations : metricExpressionHydrations
    );
  }

  return { visualizationState, datasourceStates: nextDatasourceStates };
}
