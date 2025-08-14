/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { getDatasourceId } from '@kbn/visualization-utils';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { AggregateQuery, isOfAggregateQueryType } from '@kbn/es-query';
import { isEqual } from 'lodash';
import type { VisualizeEditorContext, Suggestion } from '../types';
import { TypedLensByValueInput, TypedLensSerializedState } from '../react_embeddable/types';

/**
 * Injects the ESQL query into the lens layers. This is used to keep the query in sync with the lens layers.
 * @param attributes, the current lens attributes
 * @param query, the new query to inject
 * @returns the new lens attributes with the query injected
 */
export const injectESQLQueryIntoLensLayers = (
  attributes: TypedLensSerializedState['attributes'],
  query: AggregateQuery
) => {
  const datasourceId = getDatasourceId(attributes.state.datasourceStates);

  // if the datasource is formBased, we should not fix the query
  if (!datasourceId || datasourceId === 'formBased') {
    return attributes;
  }

  if (!attributes.state.datasourceStates[datasourceId]) {
    return attributes;
  }

  const datasourceState = structuredClone(attributes.state.datasourceStates[datasourceId]);

  if (datasourceState && datasourceState.layers) {
    Object.values(datasourceState.layers).forEach((layer) => {
      if (!isEqual(layer.query, query)) {
        layer.query = query;
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
  if (
    visAttributes.visualizationType !== suggestion.visualizationId ||
    !('textBasedColumns' in context)
  ) {
    return suggestion;
  }

  // it should be one of 'formBased'/'textBased' and have value
  const datasourceId = getDatasourceId(visAttributes.state.datasourceStates);

  // if the datasource is formBased, we should not merge
  if (!datasourceId || datasourceId === 'formBased') {
    return suggestion;
  }

  const datasourceState = Object.assign({}, visAttributes.state.datasourceStates[datasourceId]);

  // Check if index patterns match when context has a query
  if (context && 'query' in context && context.query && 'esql' in context.query) {
    const contextIndexPattern = getIndexPatternFromESQLQuery(context.query.esql);
    const visQuery = visAttributes.state.query;
    const visIndexPattern = isOfAggregateQueryType(visQuery)
      ? getIndexPatternFromESQLQuery(visQuery.esql)
      : null;

    if (contextIndexPattern !== visIndexPattern) {
      return suggestion;
    }
  }

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
      ? injectESQLQueryIntoLensLayers(visAttributes, context.query)
      : visAttributes;

  try {
    return {
      title: updatedVisAttributes.title,
      visualizationId: updatedVisAttributes.visualizationType,
      visualizationState: updatedVisAttributes.state.visualization,
      keptLayerIds: layerIds,
      datasourceState,
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
