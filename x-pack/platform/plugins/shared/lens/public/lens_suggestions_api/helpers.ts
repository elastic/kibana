/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { getDatasourceId } from '@kbn/visualization-utils';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { isEqual } from 'lodash';
import type {
  VisualizeEditorContext,
  Suggestion,
  IndexPatternRef,
  VisualizationMap,
  TypedLensByValueInput,
  TypedLensSerializedState,
  TextBasedPrivateState,
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
  shouldSwitch,
}: {
  visualizationMap: VisualizationMap;
  suggestions: Suggestion[];
  targetTypeId?: string;
  familyType: string;
  shouldSwitch: boolean;
}): Suggestion[] | undefined {
  const suggestion = suggestions.find((s) => s.visualizationId === familyType);

  if (shouldSwitch && suggestion && familyType && targetTypeId) {
    const visualizationState = visualizationMap[
      suggestion.visualizationId
    ]?.switchVisualizationType?.(targetTypeId, suggestion?.visualizationState);

    return [
      {
        ...suggestion,
        visualizationState,
      },
    ];
  }
}
