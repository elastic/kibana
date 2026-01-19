/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FormBasedLayer,
  FormBasedPrivateState,
  FramePublicAPI,
  TextBasedLayer,
  TextBasedLayerColumn,
  TextBasedPrivateState,
  TypedLensSerializedState,
  DatasourceStates,
  ValueFormatConfig,
} from '@kbn/lens-common';

import type { ConvertibleLayer, EsqlConversionData } from './convert_to_esql_modal';

interface LayerConversionData {
  layerId: string;
  layer: FormBasedLayer;
  conversionResult: {
    esql: string;
    partialRows: boolean;
    esAggsIdMap: EsqlConversionData['esAggsIdMap'];
  };
}

/**
 * Retrieves conversion data for a form-based layer using pre-computed data.
 * The pre-computed data is required - if missing, it indicates a bug in the conversion flow.
 */
function getLayerConversionData(
  layerId: string,
  layers: Record<string, FormBasedLayer>,
  preComputedData: { query: string; conversionData: EsqlConversionData }
): LayerConversionData | undefined {
  if (!(layerId in layers)) return undefined;

  const layer = layers[layerId];
  if (!layer || !layer.columnOrder || !layer.columns) return undefined;

  return {
    layerId,
    layer,
    conversionResult: {
      esql: preComputedData.query,
      esAggsIdMap: preComputedData.conversionData.esAggsIdMap,
      partialRows: preComputedData.conversionData.partialRows,
    },
  };
}

/**
 * Builds the text-based datasource state.
 * Uses pre-computed conversion data from the passed ConvertibleLayer objects.
 * Preserves original column IDs so visualizations can still reference them.
 * The fieldName property holds the ES|QL field name.
 */
function buildTextBasedState(
  layersToConvert: ConvertibleLayer[],
  layers: Record<string, FormBasedLayer>,
  framePublicAPI: FramePublicAPI
): TextBasedPrivateState | undefined {
  if (layersToConvert.length === 0) return undefined;

  const newLayers: Record<string, TextBasedLayer> = {};

  for (const convertibleLayer of layersToConvert) {
    const layerId = convertibleLayer.id;
    const preComputedData = {
      query: convertibleLayer.query,
      conversionData: convertibleLayer.conversionData,
    };

    const conversionData = getLayerConversionData(layerId, layers, preComputedData);
    if (!conversionData) continue;

    const { layer, conversionResult } = conversionData;

    // Build new text-based columns from esAggsIdMap
    // Keep original column IDs so visualizations can still reference them
    // sourceColumn from esAggsIdMap already has properly computed label (via getDefaultLabel) and format
    const newColumns: TextBasedLayerColumn[] = Object.entries(conversionResult.esAggsIdMap).map(
      ([esqlFieldName, originalColumns]) => {
        const sourceColumn = originalColumns[0];
        // Map Lens DataType to DatatableColumnType
        const dataType = sourceColumn.dataType ?? 'string';
        const metaType = dataType === 'document' ? 'string' : dataType;

        const column: TextBasedLayerColumn = {
          columnId: sourceColumn.id,
          fieldName: esqlFieldName,
          label: sourceColumn.label ?? esqlFieldName,
          meta: {
            type: metaType as TextBasedLayerColumn['meta'] extends { type: infer T } ? T : never,
          },
        };

        // Only include customLabel if it's explicitly set to true
        if (sourceColumn.customLabel) {
          column.customLabel = sourceColumn.customLabel;
        }

        // Only include params if format has a valid id
        if (sourceColumn.format?.id !== undefined) {
          column.params = { format: sourceColumn.format as ValueFormatConfig };
        }

        return column;
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

  return {
    layers: newLayers,
    indexPatternRefs: Object.values(framePublicAPI.dataViews.indexPatterns).map((ip) => ({
      id: ip.id!,
      title: ip.title,
      name: ip.name,
    })),
  };
}

interface ConvertToEsqlParams {
  /**
   * The ConvertibleLayer objects selected for conversion.
   * Contains the pre-computed ES|QL query and column mappings from useEsqlConversionCheck.
   */
  layersToConvert: ConvertibleLayer[];
  attributes: TypedLensSerializedState['attributes'];
  visualizationState: unknown;
  datasourceStates: DatasourceStates;
  framePublicAPI: FramePublicAPI;
}

/**
 * Converts form-based layers to text-based (ES|QL) and returns new attributes.
 * Returns undefined if conversion fails or no layers to convert.
 *
 * Uses pre-computed conversionData from the passed ConvertibleLayer objects to avoid
 * duplicate calls to generateEsqlQuery. The conversion data is computed once in
 * useEsqlConversionCheck and passed directly here.
 *
 * Preserves original column IDs in the text-based layer so visualizations can still
 * reference them. This approach works with all visualization types (XY, Datatable,
 * Metric, etc.) without needing to understand their different state structures.
 */
export function convertFormBasedToTextBasedLayer({
  layersToConvert,
  attributes,
  visualizationState,
  datasourceStates,
  framePublicAPI,
}: ConvertToEsqlParams): TypedLensSerializedState['attributes'] | undefined {
  if (layersToConvert.length === 0) {
    return undefined;
  }

  const formBasedState = datasourceStates.formBased?.state as FormBasedPrivateState | undefined;
  if (!formBasedState?.layers) {
    return undefined;
  }

  const newDatasourceState = buildTextBasedState(
    layersToConvert,
    formBasedState.layers,
    framePublicAPI
  );

  if (!newDatasourceState) {
    return undefined;
  }

  // Get the ES|QL query from the first converted layer
  const firstLayerId = layersToConvert[0].id;
  const esqlQuery = newDatasourceState.layers[firstLayerId]?.query;

  if (!esqlQuery) {
    return undefined;
  }

  // Build new attributes with textBased datasource
  // Keep visualization state unchanged - original column IDs are preserved in the text-based layer
  const newAttributes: TypedLensSerializedState['attributes'] = {
    ...attributes,
    state: {
      ...attributes.state,
      query: esqlQuery,
      datasourceStates: {
        textBased: newDatasourceState,
      },
      visualization: visualizationState,
    },
  };

  return newAttributes;
}
