/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DateHistogramIndexPatternColumn,
  DatasourceStates,
  FormBasedPersistedState,
  FormBasedPrivateState,
  GenericIndexPatternColumn,
  IndexPatternMap,
  LensDocument,
  MetricVisualizationState,
} from '@kbn/lens-common';
import { LENS_DATASOURCE_ID, LENS_METRIC_ID } from '@kbn/lens-common';

function isFormBasedPrivateState(state: unknown): state is FormBasedPrivateState {
  return (
    state != null &&
    typeof state === 'object' &&
    'layers' in state &&
    'currentIndexPatternId' in state
  );
}

function isDateHistogramColumn(
  column: GenericIndexPatternColumn | undefined
): column is DateHistogramIndexPatternColumn {
  return column?.operationType === 'date_histogram';
}

function getMetricTrendlineTimeColumn(
  visualizationState: MetricVisualizationState,
  datasourceStates: DatasourceStates
) {
  const { trendlineLayerId, trendlineTimeAccessor } = visualizationState;
  if (!trendlineLayerId || !trendlineTimeAccessor) {
    return {};
  }

  const rawState = datasourceStates[LENS_DATASOURCE_ID.FORM_BASED]?.state;
  if (!isFormBasedPrivateState(rawState)) {
    return {};
  }

  const formBasedState = rawState;
  const trendlineLayer = formBasedState.layers[trendlineLayerId];
  const column = trendlineLayer?.columns[trendlineTimeAccessor];

  return { formBasedState, column, trendlineLayer, trendlineLayerId, trendlineTimeAccessor };
}

export function postProcessMetricLoadedState({
  visualizationState,
  datasourceStates,
  indexPatterns,
}: {
  visualizationState: MetricVisualizationState;
  datasourceStates: DatasourceStates;
  indexPatterns: IndexPatternMap;
}) {
  const { formBasedState, trendlineLayer, column, trendlineLayerId, trendlineTimeAccessor } =
    getMetricTrendlineTimeColumn(visualizationState, datasourceStates);

  if (
    !formBasedState ||
    !trendlineLayer ||
    !trendlineLayerId ||
    !trendlineTimeAccessor ||
    !isDateHistogramColumn(column) ||
    column.sourceField
  ) {
    return { visualizationState, datasourceStates };
  }

  const indexPattern = indexPatterns[trendlineLayer.indexPatternId];
  const timeFieldName = indexPattern?.timeFieldName;
  if (!indexPattern || !timeFieldName) {
    return { visualizationState, datasourceStates };
  }

  const timeField = indexPattern.getFieldByName(timeFieldName);
  const nextFormBasedState: FormBasedPrivateState = {
    ...formBasedState,
    layers: {
      ...formBasedState.layers,
      [trendlineLayerId]: {
        ...trendlineLayer,
        columns: {
          ...trendlineLayer.columns,
          [trendlineTimeAccessor]: {
            ...column,
            sourceField: timeFieldName,
            label: timeField?.displayName ?? timeFieldName,
          },
        },
      },
    },
  };

  return {
    visualizationState,
    datasourceStates: {
      ...datasourceStates,
      [LENS_DATASOURCE_ID.FORM_BASED]: {
        ...datasourceStates[LENS_DATASOURCE_ID.FORM_BASED],
        state: nextFormBasedState,
      },
    },
  };
}

function isFormBasedPersistedState(state: unknown): state is FormBasedPersistedState {
  return state != null && typeof state === 'object' && 'layers' in state;
}

export function normalizeMetricDocumentForEquality(doc: LensDocument): LensDocument {
  if (doc.visualizationType !== LENS_METRIC_ID) {
    return doc;
  }

  const visualizationState = doc.state.visualization as MetricVisualizationState;
  const { trendlineLayerId, trendlineTimeAccessor } = visualizationState;
  if (!trendlineLayerId || !trendlineTimeAccessor) {
    return doc;
  }

  const rawState = doc.state.datasourceStates[LENS_DATASOURCE_ID.FORM_BASED];
  if (!isFormBasedPersistedState(rawState)) {
    return doc;
  }

  const column = rawState.layers[trendlineLayerId]?.columns?.[trendlineTimeAccessor];
  if (!isDateHistogramColumn(column)) {
    return doc;
  }

  column.label = '';
  column.sourceField = '';
  return doc;
}
