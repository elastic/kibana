/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type {
  DatasourceStates,
  FormBasedLayer,
  FramePublicAPI,
  VisualizationState,
} from '@kbn/lens-common';
import { partition } from 'lodash';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getESQLForLayer } from '../../../datasources/form_based/to_esql';
import type { ConvertibleLayer } from './convert_to_esql_modal';
import { operationDefinitionMap } from '../../../datasources/form_based/operations';
import type { LensPluginStartDependencies } from '../../../plugin';
import { layerTypes } from '../../..';

const cannotConvertToEsqlTooltip = i18n.translate('xpack.lens.config.cannotConvertToEsqlTooltip', {
  defaultMessage: 'This visualization cannot be converted to ES|QL',
});

const getEsqlConversionDisabledSettings = (tooltip: string = cannotConvertToEsqlTooltip) => ({
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
    datasourceId: 'formBased' | 'textBased';
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
): {
  isConvertToEsqlButtonDisabled: boolean;
  convertToEsqlButtonTooltip: string;
  convertibleLayers: ConvertibleLayer[];
} => {
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
    const datasourceState = datasourceStates[datasourceId]?.state;
    if (!isValidDatasourceState(datasourceState)) {
      return getEsqlConversionDisabledSettings();
    }

    // Guard: layer access
    const layerId = layerIds[0];
    const layers = datasourceState.layers;
    if (!layerId || !layers[layerId]) {
      return getEsqlConversionDisabledSettings();
    }

    const singleLayer = layers[layerId];
    if (!singleLayer?.columnOrder || !singleLayer?.columns) {
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

    return esqlLayer
      ? {
          isConvertToEsqlButtonDisabled: false,
          convertToEsqlButtonTooltip: i18n.translate('xpack.lens.config.convertToEsqlTooltip', {
            defaultMessage: 'Convert visualization to ES|QL',
          }),
          convertibleLayers: [
            {
              id: layerId,
              icon: 'layers',
              name: '',
              type: layerTypes.DATA,
              query: esqlLayer.esql,
              isConvertibleToEsql: true,
            },
          ],
        }
      : getEsqlConversionDisabledSettings(
          i18n.translate('xpack.lens.config.cannotConvertToEsqlUnsupportedSettingsTooltip', {
            defaultMessage: 'The visualization has unsupported settings for query mode',
          })
        );
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
