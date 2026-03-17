/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LENS_METRIC_ID,
  type DatasourceStates,
  type FormBasedLayer,
  type FormBasedPrivateState,
  type GenericIndexPatternColumn,
  type IndexPatternMap,
  type MetricVisualizationState,
} from '@kbn/lens-common';

const isMetricVisualizationState = (state: unknown): state is MetricVisualizationState =>
  typeof state === 'object' && state !== null && 'layerId' in state && 'layerType' in state;

const isFormBasedPrivateState = (state: unknown): state is FormBasedPrivateState =>
  typeof state === 'object' &&
  state !== null &&
  'currentIndexPatternId' in state &&
  'layers' in state;

/**
 * Hydrates the metric trendline datasource layer at runtime when it is
 * referenced in the visualization state but absent from the datasource layers.
 *
 * This happens when a Metric chart with `background_chart.type === 'trend'` is
 * built via the API schema transform: the static transform intentionally omits
 * the trendline layer so that the correct `date_histogram` column (keyed to the
 * DataView's actual time field) can only be produced once the real IndexPattern
 * is available.
 *
 * This function is called after `initializeDatasources()` in both initialization
 * paths (editor via `initializeSources` and embeddable via
 * `persistedStateToExpression`) via the `hydrateState` helper.
 *
 * The function is idempotent: if the trendline layer already exists in the
 * datasource state (e.g. charts saved from the Lens editor) it returns the
 * original state unchanged.
 */
export function hydrateMetricTrendlineLayer(
  visualizationType: string | null | undefined,
  visualizationState: unknown,
  datasourceStates: DatasourceStates,
  indexPatterns: IndexPatternMap
): DatasourceStates {
  if (visualizationType !== LENS_METRIC_ID) return datasourceStates;

  if (!isMetricVisualizationState(visualizationState)) return datasourceStates;
  const vizState = visualizationState;

  if (!vizState.trendlineLayerId) return datasourceStates;

  const formBasedDatasource = datasourceStates.formBased;
  if (!formBasedDatasource) return datasourceStates;

  if (!isFormBasedPrivateState(formBasedDatasource.state)) return datasourceStates;
  const formBasedState = formBasedDatasource.state;

  // Idempotent: layer already present
  if (formBasedState.layers[vizState.trendlineLayerId]) return datasourceStates;

  const mainLayer = formBasedState.layers[vizState.layerId];
  if (!mainLayer) return datasourceStates;

  const indexPattern = indexPatterns[mainLayer.indexPatternId];
  if (!indexPattern?.timeFieldName) return datasourceStates;

  const trendlineColumns: FormBasedLayer['columns'] = {};
  const columnOrder: string[] = [];

  // Time accessor — date_histogram using the DataView's actual time field
  const { trendlineTimeAccessor } = vizState;
  if (trendlineTimeAccessor) {
    trendlineColumns[trendlineTimeAccessor] = {
      label: indexPattern.timeFieldName,
      dataType: 'date',
      operationType: 'date_histogram',
      sourceField: indexPattern.timeFieldName,
      isBucketed: true,
      scale: 'interval',
      params: { interval: 'auto' },
    } as GenericIndexPatternColumn;
    columnOrder.push(trendlineTimeAccessor);
  }

  // Breakdown accessor (bucket) — insert after time accessor
  const { trendlineBreakdownByAccessor, breakdownByAccessor } = vizState;
  if (
    trendlineBreakdownByAccessor &&
    breakdownByAccessor &&
    mainLayer.columns[breakdownByAccessor]
  ) {
    trendlineColumns[trendlineBreakdownByAccessor] = {
      ...mainLayer.columns[breakdownByAccessor],
    };
    columnOrder.push(trendlineBreakdownByAccessor);
  }

  // Primary metric — copy from main layer
  const { trendlineMetricAccessor, metricAccessor } = vizState;
  if (trendlineMetricAccessor && metricAccessor && mainLayer.columns[metricAccessor]) {
    trendlineColumns[trendlineMetricAccessor] = { ...mainLayer.columns[metricAccessor] };
    columnOrder.push(trendlineMetricAccessor);
  }

  // Secondary metric — copy from main layer if present
  const { trendlineSecondaryMetricAccessor, secondaryMetricAccessor } = vizState;
  if (
    trendlineSecondaryMetricAccessor &&
    secondaryMetricAccessor &&
    mainLayer.columns[secondaryMetricAccessor]
  ) {
    trendlineColumns[trendlineSecondaryMetricAccessor] = {
      ...mainLayer.columns[secondaryMetricAccessor],
    };
    columnOrder.push(trendlineSecondaryMetricAccessor);
  }

  const trendlineLayer: FormBasedLayer = {
    indexPatternId: mainLayer.indexPatternId,
    linkToLayers: [vizState.layerId],
    columns: trendlineColumns,
    columnOrder,
    sampling: 1,
    ignoreGlobalFilters: false,
  };

  return {
    ...datasourceStates,
    formBased: {
      ...formBasedDatasource,
      state: {
        ...formBasedState,
        layers: {
          ...formBasedState.layers,
          [vizState.trendlineLayerId]: trendlineLayer,
        },
      },
    },
  };
}
