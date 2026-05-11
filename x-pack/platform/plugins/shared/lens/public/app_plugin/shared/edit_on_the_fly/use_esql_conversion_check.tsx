/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { partition } from 'lodash';

import type {
  FormBasedLayer,
  FormBasedPrivateState,
  FramePublicAPI,
  GenericIndexPatternColumn,
  VisualizationState,
  LensDatasourceId,
  TypedLensSerializedState,
  LensDocument,
} from '@kbn/lens-common';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';

import {
  generateEsqlQuery,
  isEsqlQuerySuccess,
  type ColumnRoles,
} from '../../../datasources/form_based/generate_esql_query';
import { esqlConversionFailureReasonMessages } from '../../../datasources/form_based/to_esql_failure_reasons';
import type { ConvertibleLayer } from './esql_conversion_types';
import { operationDefinitionMap } from '../../../datasources/form_based/operations';
import type { LensPluginStartDependencies } from '../../../plugin';
import { layerTypes } from '../../..';
import { useLensSelector, selectPersistedDoc } from '../../../state_management';
import { convertFormBasedToTextBasedLayer } from './convert_to_text_based_layer';

interface EsqlConversionSettings {
  isConvertToEsqlButtonDisabled: boolean;
  convertToEsqlButtonTooltip: string;
  convertibleLayers: ConvertibleLayer[];
  attributes?: TypedLensSerializedState['attributes'];
}

const getEsqlConversionDisabledSettings = (
  tooltip: string = esqlConversionFailureReasonMessages.unknown
): EsqlConversionSettings => ({
  isConvertToEsqlButtonDisabled: true,
  convertToEsqlButtonTooltip: tooltip,
  convertibleLayers: [],
});

export const useEsqlConversionCheck = (
  showConvertToEsqlButton: boolean,
  {
    attributes,
    datasourceId,
    layerIds,
    visualization,
    activeVisualization,
  }: {
    attributes: TypedLensSerializedState['attributes'] | undefined;
    datasourceId: LensDatasourceId;
    layerIds: string[];
    visualization: VisualizationState;
    activeVisualization: unknown;
  },
  {
    framePublicAPI,
    coreStart,
    startDependencies,
  }: {
    framePublicAPI: FramePublicAPI;
    coreStart: CoreStart;
    startDependencies: LensPluginStartDependencies;
  }
): EsqlConversionSettings => {
  // Get datasourceStates from Redux
  const { datasourceStates } = useLensSelector((state) => state.lens);
  const persistedDoc = useLensSelector(selectPersistedDoc);

  return useMemo(() => {
    const datasourceState = datasourceStates[datasourceId]?.state as FormBasedPrivateState;

    if (!showConvertToEsqlButton || !activeVisualization || !visualization?.state || !attributes) {
      return getEsqlConversionDisabledSettings();
    }

    const { state } = visualization;

    // Guard: charts saved to the library
    if (isSavedToLibrary(persistedDoc)) {
      return getEsqlConversionDisabledSettings(
        esqlConversionFailureReasonMessages.saved_to_library_not_supported
      );
    }

    // Guard: datasource state exists and has layers
    if (!isValidDatasourceState(datasourceState)) {
      return getEsqlConversionDisabledSettings();
    }

    const layers = datasourceState.layers as Record<string, FormBasedLayer>;

    // Extract column roles from visualization state for semantic ES|QL column naming
    const columnRoles: ColumnRoles = {};
    const visState = state as Record<string, unknown>;
    if (visState.maxAccessor && typeof visState.maxAccessor === 'string') {
      columnRoles[visState.maxAccessor] = 'max_value';
    }

    // Detect trendline layer from visualization state
    const trendlineLayerId = (visState as { trendlineLayerId?: string }).trendlineLayerId;

    // Iterate over all layers and attempt conversion for each
    const convertibleLayers: ConvertibleLayer[] = [];
    for (const layerId of layerIds) {
      const layer = layers[layerId];
      if (!layer || !layer.columnOrder || !layer.columns) {
        // Non-data layers (annotations, reference lines) are listed but not convertible
        const layerType =
          (
            activeVisualization as { getLayerType?: (id: string, s: unknown) => string }
          )?.getLayerType?.(layerId, state) ?? 'data';
        convertibleLayers.push({
          id: layerId,
          icon: 'layers',
          name: `Layer ${layerId.substring(0, 6)}`,
          type: layerType as ConvertibleLayer['type'],
          query: '',
          isConvertibleToEsql: false,
          conversionData: { esAggsIdMap: {}, partialRows: false },
        });
        continue;
      }

      const { columnOrder } = layer;
      // For trendline layers, strip includeEmptyRows from date_histogram columns
      // since ES|QL trendlines don't need gap-filling and this flag blocks conversion
      const isTrendlineLayer = layerId === trendlineLayerId;
      const columns = isTrendlineLayer
        ? Object.fromEntries(
            Object.entries(layer.columns).map(([colId, col]) => {
              const colWithParams = col as GenericIndexPatternColumn & {
                params?: Record<string, unknown>;
              };
              return col.operationType === 'date_histogram' &&
                colWithParams.params?.includeEmptyRows
                ? [colId, { ...col, params: { ...colWithParams.params, includeEmptyRows: false } }]
                : [colId, col];
            })
          )
        : { ...layer.columns };
      const layerForConversion = isTrendlineLayer ? { ...layer, columns } : layer;
      const columnEntries = columnOrder.map((colId) => [colId, columns[colId]] as const);
      const [, esAggEntries] = partition(
        columnEntries,
        ([, col]) =>
          (operationDefinitionMap[col.operationType]?.input === 'fullReference' ||
            operationDefinitionMap[col.operationType]?.input === 'managedReference') &&
          col.operationType !== 'static_value'
      );

      let esqlLayer;
      try {
        esqlLayer = generateEsqlQuery(
          esAggEntries,
          layerForConversion,
          framePublicAPI.dataViews.indexPatterns[layer.indexPatternId],
          coreStart.uiSettings,
          framePublicAPI.dateRange,
          startDependencies.data.nowProvider.get(),
          columnRoles
        );
      } catch (e) {
        convertibleLayers.push({
          id: layerId,
          icon: 'layers',
          name: `Layer ${layerId.substring(0, 6)}`,
          type: layerTypes.DATA,
          query: '',
          isConvertibleToEsql: false,
          conversionData: { esAggsIdMap: {}, partialRows: false },
        });
        continue;
      }

      if (!isEsqlQuerySuccess(esqlLayer)) {
        convertibleLayers.push({
          id: layerId,
          icon: 'layers',
          name: `Layer ${layerId.substring(0, 6)}`,
          type: layerTypes.DATA,
          query: '',
          isConvertibleToEsql: false,
          conversionData: { esAggsIdMap: {}, partialRows: false },
        });
        continue;
      }

      convertibleLayers.push({
        id: layerId,
        icon: 'layers',
        name: `Layer ${layerId.substring(0, 6)}`,
        type: layerTypes.DATA,
        query: esqlLayer.esql,
        isConvertibleToEsql: true,
        conversionData: {
          esAggsIdMap: esqlLayer.esAggsIdMap,
          partialRows: esqlLayer.partialRows,
        },
      });
    }

    // If no layers are convertible, disable the button
    if (!convertibleLayers.some((l) => l.isConvertibleToEsql)) {
      return getEsqlConversionDisabledSettings(
        esqlConversionFailureReasonMessages.function_not_supported
      );
    }

    const layersToConvert = convertibleLayers.filter((l) => l.isConvertibleToEsql);
    const newAttributes = convertFormBasedToTextBasedLayer({
      layersToConvert,
      attributes,
      visualizationState: visualization.state,
      datasourceStates,
      framePublicAPI,
    });

    if (newAttributes === undefined) {
      return getEsqlConversionDisabledSettings();
    }

    return {
      isConvertToEsqlButtonDisabled: false,
      convertToEsqlButtonTooltip: i18n.translate('xpack.lens.config.convertToEsqlTooltip', {
        defaultMessage: 'Convert visualization to ES|QL',
      }),
      convertibleLayers,
      attributes: newAttributes,
    };
  }, [
    activeVisualization,
    attributes,
    coreStart.uiSettings,
    datasourceId,
    datasourceStates,
    framePublicAPI,
    layerIds,
    showConvertToEsqlButton,
    startDependencies.data.nowProvider,
    visualization,
    persistedDoc,
  ]);
};

function isValidDatasourceState(
  datasourceState: unknown
): datasourceState is { layers: Record<string, FormBasedLayer> } {
  return Boolean(
    datasourceState &&
      typeof datasourceState === 'object' &&
      datasourceState !== null &&
      'layers' in datasourceState &&
      (datasourceState as { layers?: unknown }).layers !== undefined
  );
}

function isSavedToLibrary(persistedDoc: LensDocument | undefined) {
  return Boolean(persistedDoc && persistedDoc.savedObjectId);
}
