/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { getDatasourceId } from '@kbn/visualization-utils';
import { Parser } from '@kbn/esql-language';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { isEqual } from 'lodash';
import type {
  IndexPatternRef,
  Suggestion,
  TextBasedPrivateState,
  TypedLensByValueInput,
  TypedLensSerializedState,
  VisualizationMap,
  VisualizeEditorContext,
  XYState,
} from '@kbn/lens-common';

const datasourceHasIndexPatternRefs = (
  unknownDatasource: unknown
): unknownDatasource is TextBasedPrivateState => {
  return Boolean(
    unknownDatasource &&
      (unknownDatasource as TextBasedPrivateState)?.indexPatternRefs !== undefined
  );
};

/**
 * Injects the ESQL query into the lens layers. This is used to keep the query in sync with the lens layers.
 * @param attributes, the current lens attributes
 * @param query, the new query to inject
 * @returns the new lens attributes with the query injected
 */
export const injectESQLQueryIntoLensLayers = (
  attributes: TypedLensSerializedState['attributes'],
  query: AggregateQuery,
  suggestion: Suggestion
) => {
  const datasourceId = getDatasourceId(attributes.state.datasourceStates);

  // if the datasource is formBased, we should not fix the query
  if (!datasourceId || datasourceId === 'formBased') {
    return attributes;
  }

  if (!attributes.state.datasourceStates[datasourceId]) {
    return attributes;
  }

  const indexPattern = getIndexPatternFromESQLQuery(query.esql);

  // Find matching index pattern reference from suggestion
  let indexPatternRef: IndexPatternRef | undefined;
  if (datasourceHasIndexPatternRefs(suggestion.datasourceState)) {
    const suggestionRefs = suggestion.datasourceState.indexPatternRefs;
    indexPatternRef = suggestionRefs?.find((ref) => ref.title === indexPattern);
  }

  const datasourceState = structuredClone(attributes.state.datasourceStates[datasourceId]);

  // Update each layer with the new query and index pattern if needed
  if (datasourceState?.layers) {
    Object.values(datasourceState.layers).forEach((layer) => {
      if (!isEqual(layer.query, query)) {
        layer.query = query;
        const index = indexPatternRef?.id ?? layer.index;
        if (index) {
          layer.index = index;
        }
      }
    });
  }
  return {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        [datasourceId]: datasourceState,
      },
    },
  };
};

/**
 * Returns the suggestion updated with external visualization state for ES|QL charts
 * The visualization state is merged with the suggestion if the datasource is textBased, the columns match the context and the visualization type matches
 * @param suggestion the suggestion to be updated
 * @param visAttributes the preferred visualization attributes
 * @param context the lens suggestions api context as being set by the consumers
 * @returns updated suggestion
 */

export function mergeSuggestionWithVisContext({
  suggestion,
  visAttributes,
  context,
}: {
  suggestion: Suggestion;
  visAttributes: TypedLensByValueInput['attributes'];
  context: VisualizeFieldContext | VisualizeEditorContext;
}): Suggestion {
  if (!('textBasedColumns' in context)) {
    return suggestion;
  }

  // it should be one of 'formBased'/'textBased' and have value
  const datasourceId = getDatasourceId(visAttributes.state.datasourceStates);

  // if the datasource is formBased, we should not merge
  if (!datasourceId || datasourceId === 'formBased') {
    return suggestion;
  }

  const datasourceState = Object.assign({}, visAttributes.state.datasourceStates[datasourceId]);

  // Verify that all layer columns exist in the query result
  if (!datasourceState?.layers) {
    return suggestion;
  }

  const hasInvalidColumns = Object.values(datasourceState.layers).some((layer) =>
    layer.columns?.some(
      (column: { fieldName: string }) =>
        !context?.textBasedColumns?.find((contextCol) => contextCol.id === column.fieldName)
    )
  );

  if (hasInvalidColumns) {
    return suggestion;
  }

  const layerIds = Object.keys(datasourceState.layers);

  // Update attributes with current query if available
  const updatedVisAttributes =
    context && 'query' in context && context.query
      ? injectESQLQueryIntoLensLayers(visAttributes, context.query, suggestion)
      : visAttributes;

  try {
    return {
      title: updatedVisAttributes.title,
      visualizationId: updatedVisAttributes.visualizationType,
      visualizationState: updatedVisAttributes.state.visualization,
      keptLayerIds: layerIds,
      datasourceState: updatedVisAttributes.state.datasourceStates[datasourceId],
      datasourceId,
      columns: suggestion.columns,
      changeType: suggestion.changeType,
      score: suggestion.score,
      previewIcon: suggestion.previewIcon,
    };
  } catch {
    return suggestion;
  }
}

/**
 * Switches the visualization type of a suggestion to the specified visualization type
 * @param visualizationMap the visualization map
 * @param targetTypeId the target visualization type to switch to
 * @param familyType the family type of the current suggestion
 * @param shouldSwitch whether the visualization type should be switched
 * @returns updated suggestion or undefined if no switch was made
 */
export function switchVisualizationType({
  visualizationMap,
  suggestions,
  targetTypeId,
  familyType,
  forceSwitch,
}: {
  visualizationMap: VisualizationMap;
  suggestions: Suggestion[];
  targetTypeId?: string;
  familyType: string;
  forceSwitch: boolean;
}): Suggestion[] | undefined {
  const suggestion = suggestions.find((s) => s.visualizationId === familyType);

  const visualizationInstance = visualizationMap[familyType];

  const currentTypeId =
    suggestion &&
    targetTypeId &&
    visualizationInstance?.getVisualizationTypeId(suggestion.visualizationState);

  // Determine if a switch is required either
  // via force flag
  // or by checking if the target type is supported by the family chart type
  const shouldSwitch =
    forceSwitch ||
    (targetTypeId &&
      visualizationInstance?.isSubtypeSupported?.(targetTypeId) &&
      currentTypeId !== targetTypeId);

  if (shouldSwitch && suggestion && familyType && targetTypeId) {
    const visualizationState = visualizationInstance?.switchVisualizationType?.(
      targetTypeId,
      suggestion?.visualizationState
    );

    return [
      {
        ...suggestion,
        visualizationState,
      },
    ];
  }
}

/**
 * Determines whether a line series should be preferred for a TS/PromQL time series.
 *
 * Only applicable to TS/PromQL ES|QL queries. Considered a time series when the
 * suggestion uses a date column on the x-axis.
 *
 * @param context the lens suggestions api context as being set by the consumers
 * @param suggestion the suggestion we are about to return/switch (used to detect which columns are actually used)
 * @returns `true` if line should be preferred, `false` if not (including non-TS/PromQL ES|QL queries),
 * or `undefined` if the context is not applicable (e.g., missing query or `textBasedColumns`)
 */
export const shouldPreferLineForTimeSeries = (
  context: VisualizeFieldContext | VisualizeEditorContext,
  suggestion?: Suggestion
): boolean | undefined => {
  // Only applies to ESQL queries with textBasedColumns
  if (!('textBasedColumns' in context) || !context.textBasedColumns || !('query' in context)) {
    return undefined;
  }

  const esqlQuery = context.query?.esql;

  if (!esqlQuery) return undefined;

  const { root } = Parser.parse(esqlQuery);
  const isPromqlOrTs = root.commands.find(({ name }) => name === 'promql' || name === 'ts');

  if (!isPromqlOrTs) return false;

  if (!suggestion || suggestion.visualizationId !== 'lnsXY') return false;

  const xyState = suggestion.visualizationState as XYState;
  const xyLayers = xyState.layers ?? [];
  if (!xyLayers.length) return false;

  const datasourceState = suggestion.datasourceState as TextBasedPrivateState;
  if (!datasourceState?.layers) return false;

  for (const xyLayer of xyLayers) {
    if (xyLayer.layerType !== 'data') continue;
    const { layerId, xAccessor } = xyLayer;
    if (!xAccessor) continue;

    const layer = datasourceState.layers[layerId];
    const xColumn = layer?.columns?.find((col) => col.columnId === xAccessor);
    if (xColumn?.meta?.type === 'date') return true;
  }

  return false;
};

/**
 * Returns the preferred XY subtype for TS/PromQL queries.
 * - `line` when a date column is used by the suggestion (x-axis)
 * - `bar` otherwise (to avoid incorrectly defaulting to time-series charts)
 */
export const getPreferredXyTypeIdForTimeSeries = (
  context: VisualizeFieldContext | VisualizeEditorContext,
  suggestion?: Suggestion
): string | undefined => {
  if (!('textBasedColumns' in context) || !context.textBasedColumns || !('query' in context)) {
    return undefined;
  }

  const esqlQuery = context.query?.esql;
  if (!esqlQuery) return undefined;

  const { root } = Parser.parse(esqlQuery);
  const isPromqlOrTs = root.commands.find(({ name }) => name === 'promql' || name === 'ts');
  if (!isPromqlOrTs) return undefined;

  return shouldPreferLineForTimeSeries(context, suggestion) ? 'line' : 'bar';
};
/**
 * Normalizes the suggestion for TS/PromQL queries.
 * @param context the lens suggestions api context as being set by the consumers
 * @param visualizationMap the visualization map
 * @param suggestion the suggestion we are about to return/switch (used to detect which columns are actually used)
 * @returns the normalized suggestion
 */
export const normalizeXySuggestionForTimeSeries = ({
  context,
  visualizationMap,
  suggestion,
}: {
  context: VisualizeFieldContext | VisualizeEditorContext;
  visualizationMap: VisualizationMap;
  suggestion: Suggestion;
}): Suggestion => {
  if (suggestion.visualizationId !== 'lnsXY') return suggestion;

  const preferredXyType = getPreferredXyTypeIdForTimeSeries(context, suggestion);
  if (!preferredXyType) return suggestion;

  const switched = switchVisualizationType({
    visualizationMap,
    suggestions: [suggestion],
    targetTypeId: preferredXyType,
    familyType: 'lnsXY',
    forceSwitch: ['area', 'line'].some((type) => preferredXyType.includes(type)),
  });

  return switched?.[0] ?? suggestion;
};
