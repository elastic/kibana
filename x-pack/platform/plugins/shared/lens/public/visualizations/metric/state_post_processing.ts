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

/**
 * Hydrates the metric trendline's date histogram column with the correct time field
 * from the loaded data view. During persistence, the trendline time column may be saved
 * with an empty or incorrect sourceField (e.g., when the data view's default time field
 * is not @timestamp). This function resolves the actual timeFieldName at runtime once
 * index patterns are available, ensuring the trendline renders against the correct field.
 */
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
    !isDateHistogramColumn(column)
  ) {
    return { visualizationState, datasourceStates };
  }

  const indexPattern = indexPatterns[trendlineLayer.indexPatternId];
  const timeFieldName = indexPattern?.timeFieldName;
  // If the time field is correct -> no hydration needed
  if (!indexPattern || !timeFieldName || column.sourceField === timeFieldName) {
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

  const layer = rawState.layers[trendlineLayerId];
  const column = layer?.columns?.[trendlineTimeAccessor];
  if (!isDateHistogramColumn(column)) {
    return doc;
  }

  return {
    ...doc,
    state: {
      ...doc.state,
      datasourceStates: {
        ...doc.state.datasourceStates,
        [LENS_DATASOURCE_ID.FORM_BASED]: {
          ...rawState,
          layers: {
            ...rawState.layers,
            [trendlineLayerId]: {
              ...layer,
              columns: {
                ...layer.columns,
                [trendlineTimeAccessor]: {
                  ...column,
                  label: '',
                  sourceField: '',
                },
              },
            },
          },
        },
      },
    },
  };
}
