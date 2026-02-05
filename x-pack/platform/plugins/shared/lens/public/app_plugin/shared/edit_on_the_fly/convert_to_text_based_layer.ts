/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import type {
  DataType,
  FormBasedLayer,
  FormBasedPrivateState,
  FramePublicAPI,
  TextBasedLayer,
  TextBasedLayerColumn,
  TextBasedPrivateState,
  TypedLensSerializedState,
  ValueFormatConfig,
} from '@kbn/lens-common';

import type {
  ConvertibleLayer,
  ConvertToEsqlParams,
  EsqlConversionData,
  LayerConversionData,
} from './esql_conversion_types';

// Map Lens DataType to DatatableColumnType
// Some Lens types (counter, gauge, document) aren't valid DatatableColumnTypes
const getMetaTypeFromDataType = (dataType: DataType): DatatableColumnType => {
  if (dataType === 'document') {
    return 'string';
  }
  if (dataType === 'counter' || dataType === 'gauge') {
    return 'number';
  }
  return dataType;
};

/**
 * Retrieves conversion data for a form-based layer.
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
 * Uses data from the passed ConvertibleLayer objects.
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

    // Get index pattern for field format lookup
    const indexPattern = framePublicAPI.dataViews.indexPatterns[layer.indexPatternId];

    // Build new text-based columns from esAggsIdMap
    // Keep original column IDs so visualizations can still reference them
    // sourceColumn from esAggsIdMap already has properly computed label (via getDefaultLabel) and format
    const newColumns: TextBasedLayerColumn[] = Object.entries(conversionResult.esAggsIdMap).map(
      ([esqlFieldName, originalColumns]) => {
        const sourceColumn = originalColumns[0];
        const dataType = sourceColumn.dataType ?? 'string';
        const metaType = getMetaTypeFromDataType(dataType);

        const column: TextBasedLayerColumn = {
          columnId: sourceColumn.id,
          fieldName: esqlFieldName,
          label: sourceColumn.label ?? esqlFieldName,
          meta: {
            type: metaType,
          },
        };

        // Only include customLabel if it's explicitly set to true
        if (sourceColumn.customLabel) {
          column.customLabel = sourceColumn.customLabel;
        }

        // Determine format: user-configured first, then data view field format as fallback
        let format = sourceColumn.format;
        if (!format?.id && sourceColumn.sourceField && indexPattern?.fieldFormatMap) {
          const fieldFormat = indexPattern.fieldFormatMap[sourceColumn.sourceField];
          if (fieldFormat?.id) {
            format = fieldFormat as typeof sourceColumn.format;
          }
        }

        // Only include params if format has a valid id
        if (format?.id !== undefined) {
          column.params = { format: format as ValueFormatConfig };
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
