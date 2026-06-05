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
import {
  esqlConversionFailureReasonMessages,
  getFailureTooltip,
} from '../../../datasources/form_based/to_esql_failure_reasons';
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

    // Detect trendline layer from metric visualization state
    const trendlineLayerId = getTrendlineLayerId(state);

    // Guard: layer count (trendline layers don't count — they are auto-included)
    const dataLayerIds = trendlineLayerId
      ? layerIds.filter((id) => id !== trendlineLayerId)
      : layerIds;
    if (dataLayerIds.length > 1) {
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

    // If there is a trendline layer, attempt to convert it alongside the main layer
    const trendlineResult = trendlineLayerId
      ? tryConvertTrendlineLayer(
          trendlineLayerId,
          layers[trendlineLayerId],
          framePublicAPI,
          coreStart,
          startDependencies,
          columnRoles
        )
      : undefined;

    // If a trendline layer exists but failed to convert, disable the button
    // rather than silently dropping the trendline
    if (trendlineLayerId && trendlineResult && !trendlineResult.success) {
      return getEsqlConversionDisabledSettings(
        esqlConversionFailureReasonMessages.trendline_not_supported
      );
    }

    // Trendline is auto-included in the conversion but not shown in the modal
    const layersToConvert = trendlineResult?.success
      ? [...convertibleLayers, trendlineResult.layer]
      : convertibleLayers;

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
    coreStart,
    datasourceId,
    datasourceStates,
    framePublicAPI,
    layerIds,
    showConvertToEsqlButton,
    startDependencies,
    visualization,
    persistedDoc,
  ]);
};

/**
 * Extracts the trendline layer ID from metric visualization state, if present.
 */
function getTrendlineLayerId(state: unknown): string | undefined {
  if (
    state &&
    typeof state === 'object' &&
    'trendlineLayerId' in state &&
    typeof (state as { trendlineLayerId: unknown }).trendlineLayerId === 'string'
  ) {
    return (state as { trendlineLayerId: string }).trendlineLayerId;
  }
  return undefined;
}

/**
 * Attempts to convert a trendline layer to ES|QL.
 * Returns a ConvertibleLayer on success, or undefined if conversion fails.
 * Trendline layers have includeEmptyRows stripped from date_histogram columns
 * since ES|QL trendlines don't need gap-filling and this flag blocks conversion.
 */
function tryConvertTrendlineLayer(
  trendlineLayerId: string,
  layer: FormBasedLayer | undefined,
  framePublicAPI: FramePublicAPI,
  coreStart: CoreStart,
  startDependencies: LensPluginStartDependencies,
  columnRoles: ColumnRoles
): { success: true; layer: ConvertibleLayer } | { success: false; reason?: string } {
  if (!layer?.columnOrder || !layer?.columns) return { success: false };

  // Defensive patching of date_histogram columns for trendline conversion.
  //
  // - includeEmptyRows: ES|QL trendlines don't need gap-filling; this flag blocks conversion.
  // - sourceField: normally set by initializeDimension via autoTimeField, but can be empty
  //   in edge cases (e.g. missing timeFieldName at creation time).
  const indexPattern = framePublicAPI.dataViews.indexPatterns[layer.indexPatternId];
  const timeFieldName = indexPattern?.timeFieldName ?? '';
  const columns = Object.fromEntries(
    Object.entries(layer.columns).map(([colId, col]) => {
      if (col.operationType !== 'date_histogram') return [colId, col];
      const colWithParams = col as GenericIndexPatternColumn & {
        sourceField?: string;
        params?: Record<string, unknown>;
      };
      const needsSourceField = !colWithParams.sourceField && timeFieldName;
      const needsStripEmptyRows = colWithParams.params?.includeEmptyRows;
      if (!needsSourceField && !needsStripEmptyRows) return [colId, col];
      return [
        colId,
        {
          ...col,
          ...(needsSourceField ? { sourceField: timeFieldName } : {}),
          ...(needsStripEmptyRows
            ? { params: { ...colWithParams.params, includeEmptyRows: false } }
            : {}),
        },
      ];
    })
  );

  const columnEntries = layer.columnOrder.map((colId) => [colId, columns[colId]] as const);
  const [, esAggEntries] = partition(
    columnEntries,
    ([, col]) =>
      (operationDefinitionMap[col.operationType]?.input === 'fullReference' ||
        operationDefinitionMap[col.operationType]?.input === 'managedReference') &&
      col.operationType !== 'static_value'
  );

  try {
    const esqlLayer = generateEsqlQuery(
      esAggEntries,
      { ...layer, columns },
      framePublicAPI.dataViews.indexPatterns[layer.indexPatternId],
      coreStart.uiSettings,
      framePublicAPI.dateRange,
      startDependencies.data.nowProvider.get(),
      columnRoles
    );
    if (!isEsqlQuerySuccess(esqlLayer)) {
      return { success: false, reason: esqlLayer?.reason };
    }

    return {
      success: true,
      layer: {
        id: trendlineLayerId,
        icon: 'layers',
        name: 'Trendline',
        type: layerTypes.DATA,
        query: esqlLayer.esql,
        isConvertibleToEsql: true,
        conversionData: {
          esAggsIdMap: esqlLayer.esAggsIdMap,
          partialRows: esqlLayer.partialRows,
        },
      },
    };
  } catch {
    return { success: false };
  }
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

function isSavedToLibrary(persistedDoc: LensDocument | undefined) {
  return Boolean(persistedDoc && persistedDoc.savedObjectId);
}
