/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TextBasedPrivateState, TypedLensSerializedState } from '@kbn/lens-common';

/**
 * Remaps visualization state column IDs to new ES|QL field names
 */
function remapVisualizationState(
  visualizationState: unknown,
  layersToConvert: string[],
  columnIdMapping: Record<string, string>
): unknown {
  if (
    !visualizationState ||
    typeof visualizationState !== 'object' ||
    !('layers' in (visualizationState as Record<string, unknown>))
  ) {
    return visualizationState;
  }

  const updatedVisualizationState = JSON.parse(JSON.stringify(visualizationState));

  if (Array.isArray(updatedVisualizationState.layers)) {
    updatedVisualizationState.layers = updatedVisualizationState.layers.map(
      (vizLayer: {
        layerId?: string;
        xAccessor?: string;
        accessors?: string[];
        splitAccessor?: string;
      }) => {
        if (!vizLayer.layerId || !layersToConvert.includes(vizLayer.layerId)) {
          return vizLayer;
        }

        const updatedLayer = { ...vizLayer };

        // Remap xAccessor (horizontal axis - typically the date histogram)
        if (vizLayer.xAccessor && columnIdMapping[vizLayer.xAccessor]) {
          updatedLayer.xAccessor = columnIdMapping[vizLayer.xAccessor];
        }

        // Remap accessors array (vertical axis - metrics)
        if (Array.isArray(vizLayer.accessors)) {
          updatedLayer.accessors = vizLayer.accessors.map(
            (accessor: string) => columnIdMapping[accessor] || accessor
          );
        }

        // Remap splitAccessor if present
        if (vizLayer.splitAccessor && columnIdMapping[vizLayer.splitAccessor]) {
          updatedLayer.splitAccessor = columnIdMapping[vizLayer.splitAccessor];
        }

        return updatedLayer;
      }
    );
  }

  return updatedVisualizationState;
}

interface ConvertToEsqlParams {
  layersToConvert: string[];
  attributes: TypedLensSerializedState['attributes'];
  visualizationState: unknown;
  buildTextBasedState: (
    layersToConvert: string[]
  ) =>
    | { newDatasourceState: TextBasedPrivateState; columnIdMapping: Record<string, string> }
    | undefined;
}

/**
 * Converts form-based layers to ES|QL and returns new attributes.
 * Returns undefined if conversion fails or no layers to convert.
 */
export function convertToEsql({
  layersToConvert,
  attributes,
  visualizationState,
  buildTextBasedState,
}: ConvertToEsqlParams): TypedLensSerializedState['attributes'] | undefined {
  if (layersToConvert.length === 0) {
    return undefined;
  }

  const conversionResult = buildTextBasedState(layersToConvert);
  if (!conversionResult) {
    return undefined;
  }

  const { newDatasourceState, columnIdMapping } = conversionResult;

  // Check if visualization state has layers to remap
  if (
    !visualizationState ||
    typeof visualizationState !== 'object' ||
    !('layers' in (visualizationState as Record<string, unknown>))
  ) {
    return undefined;
  }

  const updatedVisualizationState = remapVisualizationState(
    visualizationState,
    layersToConvert,
    columnIdMapping
  );

  // Get the ES|QL query from the first converted layer
  const firstLayerId = layersToConvert[0];
  const esqlQuery = newDatasourceState.layers[firstLayerId]?.query;

  if (!esqlQuery) {
    return undefined;
  }

  // Build new attributes with textBased datasource
  const newAttributes: TypedLensSerializedState['attributes'] = {
    ...attributes,
    state: {
      ...attributes.state,
      query: esqlQuery,
      datasourceStates: {
        textBased: newDatasourceState,
      },
      visualization: updatedVisualizationState,
    },
  };

  return newAttributes;
}
