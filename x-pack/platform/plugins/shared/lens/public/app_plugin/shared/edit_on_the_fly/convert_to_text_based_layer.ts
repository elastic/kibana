/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import type { CoreStart } from '@kbn/core/public';
import type {
  FormBasedLayer,
  FormBasedPrivateState,
  FramePublicAPI,
  TextBasedLayer,
  TextBasedLayerColumn,
  TextBasedPrivateState,
  TypedLensSerializedState,
  DatasourceStates,
} from '@kbn/lens-common';

import type { OriginalColumn } from '../../../../common/types';
import {
  generateEsqlQuery,
  type EsqlQueryResult,
} from '../../../datasources/form_based/generate_esql_query';
import { operationDefinitionMap } from '../../../datasources/form_based/operations';
import type { LensPluginStartDependencies } from '../../../plugin';

interface EsqlConversionResult {
  esql: string;
  partialRows: boolean;
  esAggsIdMap: Record<string, OriginalColumn[]>;
}

/**
 * Extracts a successful EsqlConversionResult from an EsqlQueryResult, or returns undefined if failed.
 */
function extractSuccessResult(result: EsqlQueryResult): EsqlConversionResult | undefined {
  if (result.success) {
    return {
      esql: result.esql,
      partialRows: result.partialRows,
      esAggsIdMap: result.esAggsIdMap,
    };
  }
  return undefined;
}

interface LayerConversionData {
  layerId: string;
  layer: FormBasedLayer;
  conversionResult: EsqlConversionResult;
}

/**
 * Minimal interface for visualization states that contain layers.
 * Each visualization type (XY, partition, metric, etc.) has its own state shape,
 * but they all share a `layers` array. There's no common base type in @kbn/lens-common,
 * so we use this minimal interface for type narrowing.
 */
interface VisualizationStateWithLayers {
  layers: unknown[];
}

/**
 * Type guard to check if visualization state has a layers array
 */
function hasLayers(state: unknown): state is VisualizationStateWithLayers {
  return Array.isArray((state as VisualizationStateWithLayers | null)?.layers);
}

/**
 * Common layer properties used for column ID remapping during conversion.
 * There's no shared base layer type in @kbn/lens-common - each visualization
 * (XY, partition, heatmap, etc.) defines its own layer config. This interface
 * captures only the properties we need to remap for XY-like visualizations.
 */
interface VisualizationLayer {
  layerId?: string;
  xAccessor?: string;
  accessors?: string[];
  splitAccessor?: string;
}

/**
 * Remaps visualization state column IDs to new ES|QL field names
 */
function remapVisualizationState(
  visualizationState: VisualizationStateWithLayers,
  layersToConvert: string[],
  columnIdMapping: Record<string, string>
): VisualizationStateWithLayers {
  const updatedVisualizationState = structuredClone(visualizationState);

  updatedVisualizationState.layers = updatedVisualizationState.layers.map((vizLayer: unknown) => {
    const layer = vizLayer as VisualizationLayer;
    if (!layer.layerId || !layersToConvert.includes(layer.layerId)) {
      return vizLayer;
    }

    const updatedLayer = structuredClone(layer);

    // Remap xAccessor (horizontal axis, for example a time axis)
    if (layer.xAccessor && columnIdMapping[layer.xAccessor]) {
      updatedLayer.xAccessor = columnIdMapping[layer.xAccessor];
    }

    // Remap accessors array (vertical axis, for example counts or metrics)
    if (Array.isArray(layer.accessors)) {
      updatedLayer.accessors = layer.accessors.map(
        (accessor) => columnIdMapping[accessor] || accessor
      );
    }

    // Remap splitAccessor if present
    if (layer.splitAccessor && columnIdMapping[layer.splitAccessor]) {
      updatedLayer.splitAccessor = columnIdMapping[layer.splitAccessor];
    }

    return updatedLayer;
  });

  return updatedVisualizationState;
}

/**
 * Computes conversion data for a form-based layer
 */
function getLayerConversionData(
  layerId: string,
  layers: Record<string, FormBasedLayer>,
  framePublicAPI: FramePublicAPI,
  coreStart: CoreStart,
  startDependencies: LensPluginStartDependencies
): LayerConversionData | undefined {
  if (!(layerId in layers)) return undefined;

  const layer = layers[layerId];
  if (!layer || !layer.columnOrder || !layer.columns) return undefined;

  // Get the esAggEntries
  const { columnOrder } = layer;
  const columns = { ...layer.columns };
  const columnEntries = columnOrder.map((colId) => [colId, columns[colId]] as const);
  const [, esAggEntries] = partition(
    columnEntries,
    ([, col]) =>
      operationDefinitionMap[col.operationType]?.input === 'fullReference' ||
      operationDefinitionMap[col.operationType]?.input === 'managedReference'
  );

  const indexPattern = framePublicAPI.dataViews.indexPatterns[layer.indexPatternId];
  if (!indexPattern) return undefined;

  let esqlResult: EsqlConversionResult | undefined;
  try {
    const queryResult = generateEsqlQuery(
      esAggEntries,
      layer,
      indexPattern,
      coreStart.uiSettings,
      framePublicAPI.dateRange,
      startDependencies.data.nowProvider.get()
    );
    esqlResult = extractSuccessResult(queryResult);
  } catch (e) {
    // Layer remains non-convertible
  }

  if (!esqlResult) return undefined;

  return {
    layerId,
    layer,
    conversionResult: esqlResult,
  };
}

interface BuildTextBasedStateReturnType {
  newDatasourceState: TextBasedPrivateState;
  columnIdMapping: Record<string, string>;
}

/**
 * Builds the text-based datasource state and column ID mapping
 */
function buildTextBasedState(
  layersToConvert: string[],
  layers: Record<string, FormBasedLayer>,
  framePublicAPI: FramePublicAPI,
  coreStart: CoreStart,
  startDependencies: LensPluginStartDependencies
): BuildTextBasedStateReturnType | undefined {
  if (layersToConvert.length === 0) return undefined;

  const newLayers: Record<string, TextBasedLayer> = {};
  const columnIdMapping: Record<string, string> = {};

  for (const layerId of layersToConvert) {
    const conversionData = getLayerConversionData(
      layerId,
      layers,
      framePublicAPI,
      coreStart,
      startDependencies
    );
    if (!conversionData) continue;

    const { layer, conversionResult } = conversionData;

    // Build new text-based columns from esAggsIdMap
    const newColumns: TextBasedLayerColumn[] = Object.entries(conversionResult.esAggsIdMap).map(
      ([esqlFieldName, originalColumns]) => {
        const sourceColumn = originalColumns[0];
        // Get the original column from the layer to access dataType
        const originalLayerColumn = layer.columns[sourceColumn.id];
        // Map Lens DataType to DatatableColumnType
        const dataType = originalLayerColumn?.dataType ?? 'string';
        const metaType = dataType === 'document' ? 'string' : dataType;

        // Map old column ID to new ES|QL field name
        columnIdMapping[sourceColumn.id] = esqlFieldName;

        return {
          columnId: esqlFieldName,
          fieldName: esqlFieldName,
          meta: {
            type: metaType as TextBasedLayerColumn['meta'] extends { type: infer T } ? T : never,
          },
        };
      }
    );

    newLayers[layerId] = {
      index: layer.indexPatternId,
      query: { esql: conversionResult.esql },
      columns: newColumns,
      timeField: framePublicAPI.dataViews.indexPatterns[layer.indexPatternId]?.timeFieldName,
    };
  }

  if (Object.keys(newLayers).length === 0) return undefined;

  const newDatasourceState: TextBasedPrivateState = {
    layers: newLayers,
    indexPatternRefs: Object.values(framePublicAPI.dataViews.indexPatterns).map((ip) => ({
      id: ip.id!,
      title: ip.title,
      name: ip.name,
    })),
  };

  return { newDatasourceState, columnIdMapping };
}

interface ConvertToEsqlParams {
  layersToConvert: string[];
  attributes: TypedLensSerializedState['attributes'];
  visualizationState: unknown;
  datasourceStates: DatasourceStates;
  framePublicAPI: FramePublicAPI;
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
}

/**
 * Converts form-based layers to text-based (ES|QL) and returns new attributes.
 * Returns undefined if conversion fails or no layers to convert.
 */
export function convertFormBasedToTextBasedLayer({
  layersToConvert,
  attributes,
  visualizationState,
  datasourceStates,
  framePublicAPI,
  coreStart,
  startDependencies,
}: ConvertToEsqlParams): TypedLensSerializedState['attributes'] | undefined {
  if (layersToConvert.length === 0) {
    return undefined;
  }

  const formBasedState = datasourceStates.formBased?.state as FormBasedPrivateState | undefined;
  if (!formBasedState?.layers) {
    return undefined;
  }

  const conversionResult = buildTextBasedState(
    layersToConvert,
    formBasedState.layers,
    framePublicAPI,
    coreStart,
    startDependencies
  );

  if (!conversionResult) {
    return undefined;
  }

  const { newDatasourceState, columnIdMapping } = conversionResult;

  // Check if visualization state has layers to remap
  if (!hasLayers(visualizationState)) {
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
