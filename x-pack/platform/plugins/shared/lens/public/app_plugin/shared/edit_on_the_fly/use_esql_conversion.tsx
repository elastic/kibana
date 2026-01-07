/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { partition } from 'lodash';

import type {
  DatasourceStates,
  FormBasedLayer,
  FormBasedPrivateState,
  FramePublicAPI,
  TextBasedLayerColumn,
  TextBasedPrivateState,
  VisualizationState,
  SupportedDatasourceId,
} from '@kbn/lens-common';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { OriginalColumn } from '../../../../common/types';
import { getESQLForLayer } from '../../../datasources/form_based/to_esql';
import type { ConvertibleLayer } from './convert_to_esql_modal';
import { operationDefinitionMap } from '../../../datasources/form_based/operations';
import type { LensPluginStartDependencies } from '../../../plugin';
import { layerTypes } from '../../..';

interface EsqlConversionResult {
  esql: string;
  partialRows: boolean;
  esAggsIdMap: Record<string, OriginalColumn[]>;
}

interface LayerConversionData {
  layerId: string;
  layer: FormBasedLayer;
  conversionResult: EsqlConversionResult;
}

const cannotConvertToEsqlTooltip = i18n.translate('xpack.lens.config.cannotConvertToEsqlTooltip', {
  defaultMessage: 'This visualization cannot be converted to ES|QL',
});

interface EsqlConversionDisabledSettings {
  isConvertToEsqlButtonDisabled: boolean;
  convertToEsqlButtonTooltip: string;
  convertibleLayers: ConvertibleLayer[];
  getConversionData?: (layerId: string) => LayerConversionData | undefined;
  buildTextBasedState?: (layersToConvert: string[]) =>
    | {
        newDatasourceState: TextBasedPrivateState;
        columnIdMapping: Record<string, string>;
      }
    | undefined;
}

const getEsqlConversionDisabledSettings = (
  tooltip: string = cannotConvertToEsqlTooltip
): EsqlConversionDisabledSettings => ({
  isConvertToEsqlButtonDisabled: true,
  convertToEsqlButtonTooltip: tooltip,
  convertibleLayers: [],
});

export const useEsqlConversion = (
  showConvertToEsqlButton: boolean,
  {
    datasourceId,
    datasourceStates,
    layerIds,
    visualization,
    activeVisualization,
  }: {
    datasourceId: SupportedDatasourceId;
    datasourceStates: DatasourceStates;
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
): EsqlConversionDisabledSettings => {
  return useMemo(() => {
    if (!showConvertToEsqlButton) {
      return getEsqlConversionDisabledSettings();
    }

    if (!activeVisualization || !visualization?.state) {
      return getEsqlConversionDisabledSettings();
    }

    const { state } = visualization;

    // Guard: trendline check
    if (hasTrendLineLayer(state)) {
      return getEsqlConversionDisabledSettings(
        i18n.translate('xpack.lens.config.cannotConvertToEsqlMetricWithTrendlineTooltip', {
          defaultMessage: 'Metric visualization with a trend line are not supported in query mode',
        })
      );
    }

    // Guard: layer count
    if (layerIds.length > 1) {
      return getEsqlConversionDisabledSettings(
        i18n.translate('xpack.lens.config.cannotConvertToEsqlMultilayerTooltip', {
          defaultMessage: 'Multi-layer visualizations cannot be converted to query mode',
        })
      );
    }

    // Guard: datasource state exists and has layers
    const datasourceState = datasourceStates[datasourceId]?.state as FormBasedPrivateState;
    if (!isValidDatasourceState(datasourceState)) {
      return getEsqlConversionDisabledSettings();
    }

    // Guard: layer access
    const firstLayerId = layerIds[0];
    const layers = datasourceState.layers as Record<string, FormBasedLayer>;
    if (!firstLayerId || !layers[firstLayerId]) {
      return getEsqlConversionDisabledSettings();
    }

    const singleLayer = layers[firstLayerId];
    if (!singleLayer?.columnOrder || !singleLayer?.columns) {
      return getEsqlConversionDisabledSettings();
    }

    // Main logic: compute esqlLayer
    const conversionDataMap = (() => {
      const result: Record<string, LayerConversionData> = {};

      for (const layerId of layerIds) {
        if (!(layerId in layers)) continue;

        const layer = layers[layerId];
        if (!layer || !layer.columnOrder || !layer.columns) continue;

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
        if (!indexPattern) continue;

        let esqlResult;
        try {
          esqlResult = getESQLForLayer(
            esAggEntries,
            layer,
            indexPattern,
            coreStart.uiSettings,
            framePublicAPI.dateRange,
            startDependencies.data.nowProvider.get()
          );
        } catch (e) {
          // Layer remains non-convertible
          // This prevents conversion errors from breaking the visualization
        }

        if (esqlResult) {
          result[layerId] = {
            layerId,
            layer,
            conversionResult: esqlResult,
          };
        }
      }

      return result;
    })();

    if (Object.keys(conversionDataMap).length === 0) {
      return getEsqlConversionDisabledSettings(
        i18n.translate('xpack.lens.config.cannotConvertToEsqlUnsupportedSettingsTooltip', {
          defaultMessage: 'The visualization has unsupported settings for query mode',
        })
      );
    }

    const convertibleLayers = (() => {
      return layerIds.map((layerId) => {
        const conversionData = conversionDataMap[layerId];
        return {
          id: layerId,
          icon: 'layers',
          name: '',
          type: layerTypes.DATA,
          query: conversionData?.conversionResult.esql ?? '',
          isConvertibleToEsql: !!conversionData,
        } as ConvertibleLayer;
      });
    })();

    const hasConvertibleLayers = (() => {
      return convertibleLayers.every((layer) => !layer.isConvertibleToEsql);
    })();

    if (!hasConvertibleLayers) {
      return getEsqlConversionDisabledSettings(
        i18n.translate('xpack.lens.config.cannotConvertToEsqlNoConvertibleLayersTooltip', {
          defaultMessage: 'No layers can be converted to query mode',
        })
      );
    }

    const getConversionData = (layerId: string) => conversionDataMap[layerId];

    const buildTextBasedState = (
      layersToConvert: string[]
    ):
      | { newDatasourceState: TextBasedPrivateState; columnIdMapping: Record<string, string> }
      | undefined => {
      if (layersToConvert.length === 0) return undefined;

      if (!datasourceState) return undefined;

      const newLayers: Record<string, TextBasedPrivateState['layers'][string]> = {};
      const columnIdMapping: Record<string, string> = {};

      for (const layerId of layersToConvert) {
        const conversionData = conversionDataMap[layerId];
        if (!conversionData) continue;

        const { layer, conversionResult } = conversionData;

        // Build new text-based columns from esAggsIdMap
        const newColumns: TextBasedLayerColumn[] = Object.entries(conversionResult.esAggsIdMap).map(
          ([esqlFieldName, originalColumns]) => {
            const sourceColumn = originalColumns[0];
            // Get the original column from the layer to access dataType
            const originalLayerColumn = layer.columns[sourceColumn.id];
            // Map Lens DataType to DatatableColumnType (they use slightly different type names)
            const dataType = originalLayerColumn?.dataType ?? 'string';
            const metaType = dataType === 'document' ? 'string' : dataType;

            // Map old column ID to new ES|QL field name
            columnIdMapping[sourceColumn.id] = esqlFieldName;

            return {
              columnId: esqlFieldName,
              fieldName: esqlFieldName,
              meta: {
                type: metaType as TextBasedLayerColumn['meta'] extends { type: infer T }
                  ? T
                  : never,
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
    };

    return {
      isConvertToEsqlButtonDisabled: false,
      convertToEsqlButtonTooltip: i18n.translate('xpack.lens.config.convertToEsqlTooltip', {
        defaultMessage: 'Convert visualization to ES|QL',
      }),
      convertibleLayers,
      getConversionData,
      buildTextBasedState,
    };
  }, [
    activeVisualization,
    coreStart.uiSettings,
    datasourceId,
    datasourceStates,
    framePublicAPI.dataViews.indexPatterns,
    framePublicAPI.dateRange,
    layerIds,
    showConvertToEsqlButton,
    startDependencies.data.nowProvider,
    visualization,
  ]);
};

function hasTrendLineLayer(state: unknown) {
  return Boolean(
    state &&
      typeof state === 'object' &&
      'trendlineLayerId' in state &&
      'trendlineMetricAccessor' in state &&
      'trendlineTimeAccessor' in state &&
      state.trendlineLayerId &&
      state.trendlineMetricAccessor &&
      state.trendlineTimeAccessor
  );
}

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
