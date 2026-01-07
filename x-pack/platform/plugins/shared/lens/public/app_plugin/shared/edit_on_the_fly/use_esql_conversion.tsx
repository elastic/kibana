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
} from '@kbn/lens-common';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';

import { getESQLForLayer } from '../../../datasources/form_based/to_esql';
import type { ConvertibleLayer } from './convert_to_esql_modal';
import { operationDefinitionMap } from '../../../datasources/form_based/operations';
import type { LensPluginStartDependencies } from '../../../plugin';
import { layerTypes } from '../../..';
import { useLensSelector } from '../../../state_management';

const cannotConvertToEsqlTooltip = i18n.translate('xpack.lens.config.cannotConvertToEsqlTooltip', {
  defaultMessage: 'This visualization cannot be converted to ES|QL',
});

interface EsqlConversionDisabledSettings {
  isConvertToEsqlButtonDisabled: boolean;
  convertToEsqlButtonTooltip: string;
  convertibleLayers: ConvertibleLayer[];
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
    layerIds,
    visualization,
    activeVisualization,
  }: {
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
): EsqlConversionDisabledSettings => {
  // Get datasourceStates from Redux
  const { datasourceStates } = useLensSelector((state) => state.lens);

  return useMemo(() => {
    const datasourceState = datasourceStates[datasourceId]?.state as FormBasedPrivateState;

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
    if (!isValidDatasourceState(datasourceState)) {
      return getEsqlConversionDisabledSettings();
    }

    // Guard: layer access
    const layers = datasourceState.layers as Record<string, FormBasedLayer>;
    const layerId = layerIds[0];
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
        operationDefinitionMap[col.operationType]?.input === 'fullReference' ||
        operationDefinitionMap[col.operationType]?.input === 'managedReference'
    );

    let esqlLayer;
    try {
      esqlLayer = getESQLForLayer(
        esAggEntries,
        singleLayer,
        framePublicAPI.dataViews.indexPatterns[singleLayer.indexPatternId],
        coreStart.uiSettings,
        framePublicAPI.dateRange,
        startDependencies.data.nowProvider.get()
      );
    } catch (e) {
      // Layer remains non-convertible
      // This prevents conversion errors from breaking the visualization
    }

    const convertibleLayer: ConvertibleLayer = {
      id: layerId,
      icon: 'layers',
      name: '',
      type: layerTypes.DATA,
      query: esqlLayer ? esqlLayer.esql : '',
      isConvertibleToEsql: !!esqlLayer,
    };

    return {
      isConvertToEsqlButtonDisabled: false,
      convertToEsqlButtonTooltip: i18n.translate('xpack.lens.config.convertToEsqlTooltip', {
        defaultMessage: 'Convert visualization to ES|QL',
      }),
      convertibleLayers: [convertibleLayer],
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
