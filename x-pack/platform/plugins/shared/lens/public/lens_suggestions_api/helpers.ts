/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { getDatasourceId } from '@kbn/visualization-utils';
import type { VisualizeEditorContext, Suggestion, VisualizationMap } from '../types';
import { TypedLensByValueInput } from '../react_embeddable/types';

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

  // should be based on same columns
  if (
    !datasourceState?.layers ||
    Object.values(datasourceState?.layers).some(
      (layer) =>
        layer.columns?.some(
          (c: { fieldName: string }) =>
            !context?.textBasedColumns?.find((col) => col.id === c.fieldName)
        ) || layer.columns?.length !== context?.textBasedColumns?.length
    )
  ) {
    return suggestion;
  }
  const layerIds = Object.keys(datasourceState.layers);
  try {
    return {
      title: visAttributes.title,
      visualizationId: visAttributes.visualizationType,
      visualizationState: visAttributes.state.visualization,
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
