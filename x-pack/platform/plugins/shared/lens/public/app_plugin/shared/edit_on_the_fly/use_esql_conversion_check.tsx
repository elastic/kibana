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
  VisualizationState,
  SupportedDatasourceId,
  TypedLensSerializedState,
} from '@kbn/lens-common';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';

import {
  generateEsqlQuery,
  isEsqlQuerySuccess,
  type ColumnRoles,
} from '../../../datasources/form_based/generate_esql_query';
import {
  esqlConversionFailureReasonMessages,
  getFailureTooltip,
} from '../../../datasources/form_based/to_esql_failure_reasons';
import type { ConvertibleLayer } from './esql_conversion_types';
import { operationDefinitionMap } from '../../../datasources/form_based/operations';
import type { LensPluginStartDependencies } from '../../../plugin';
import { layerTypes } from '../../..';
import { useLensSelector } from '../../../state_management';
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
    datasourceId: SupportedDatasourceId;
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

  return useMemo(() => {
    const datasourceState = datasourceStates[datasourceId]?.state as FormBasedPrivateState;

    if (!showConvertToEsqlButton || !activeVisualization || !visualization?.state || !attributes) {
      return getEsqlConversionDisabledSettings();
    }

    const { state } = visualization;

    // Guard: trendline check
    if (hasTrendLineLayer(state)) {
      return getEsqlConversionDisabledSettings(
        esqlConversionFailureReasonMessages.trend_line_not_supported
      );
    }

    // Guard: layer count
    if (layerIds.length > 1) {
      return getEsqlConversionDisabledSettings(
        esqlConversionFailureReasonMessages.multi_layer_not_supported
      );
    }

    // Guard: datasource state exists and has layers
    if (!isValidDatasourceState(datasourceState)) {
      return getEsqlConversionDisabledSettings();
    }

    // Guard: layer access
    const layerId = layerIds[0];
    const layers = datasourceState.layers as Record<string, FormBasedLayer>;
    if (!layerId || !layers[layerId]) {
      return getEsqlConversionDisabledSettings();
    }

    const singleLayer = layers[layerId];
    if (!singleLayer || !singleLayer.columnOrder || !singleLayer.columns) {
      return getEsqlConversionDisabledSettings();
    }

    // Main logic: compute esqlLayer
    const { columnOrder } = singleLayer;
    const columns = { ...singleLayer.columns };
    const columnEntries = columnOrder.map((colId) => [colId, columns[colId]] as const);
    const [, esAggEntries] = partition(
      columnEntries,
      ([, col]) =>
        (operationDefinitionMap[col.operationType]?.input === 'fullReference' ||
          operationDefinitionMap[col.operationType]?.input === 'managedReference') &&
        // Keep static_value columns - they'll be converted to EVAL statements
        col.operationType !== 'static_value'
    );

    // Extract column roles from visualization state for semantic ES|QL column naming
    const columnRoles: ColumnRoles = {};
    const visState = state as Record<string, unknown>;
    if (visState.maxAccessor && typeof visState.maxAccessor === 'string') {
      columnRoles[visState.maxAccessor] = 'max_value';
    }

    let esqlLayer;
    try {
      esqlLayer = generateEsqlQuery(
        esAggEntries,
        singleLayer,
        framePublicAPI.dataViews.indexPatterns[singleLayer.indexPatternId],
        coreStart.uiSettings,
        framePublicAPI.dateRange,
        startDependencies.data.nowProvider.get(),
        columnRoles
      );
    } catch (e) {
      // Layer remains non-convertible
      // This prevents conversion errors from breaking the visualization
      return getEsqlConversionDisabledSettings(esqlConversionFailureReasonMessages.unknown);
    }

    if (!isEsqlQuerySuccess(esqlLayer)) {
      const reason = esqlLayer?.reason;
      const tooltipMessage = getFailureTooltip(reason);
      return getEsqlConversionDisabledSettings(tooltipMessage);
    }

    const convertibleLayers: ConvertibleLayer[] = [
      {
        id: layerId,
        icon: 'layers',
        name: '',
        type: layerTypes.DATA,
        query: esqlLayer.esql,
        isConvertibleToEsql: true,
        conversionData: {
          esAggsIdMap: esqlLayer.esAggsIdMap,
          partialRows: esqlLayer.partialRows,
        },
      },
    ];

    const newAttributes = convertFormBasedToTextBasedLayer({
      layersToConvert: convertibleLayers,
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
