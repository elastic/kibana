/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DatasourceStates, FormBasedLayer, FramePublicAPI } from '@kbn/lens-common';
import { partition } from 'lodash';
import type { CoreStart } from '@kbn/core/public';
import { getESQLForLayer } from '../../../datasources/form_based/to_esql';
import type { ConvertibleLayer } from './convert_to_esql_modal';
import { operationDefinitionMap } from '../../../datasources/form_based/operations';
import type { LensPluginStartDependencies } from '../../../plugin';
import { layerTypes } from '../../..';

export const useEsqlConversion = (
  datasourceId: 'formBased' | 'textBased',
  datasourceStates: DatasourceStates,
  isSingleLayerVisualization: boolean,
  layerIds: string[],
  textBasedMode: boolean,
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
  convertibleLayers: ConvertibleLayer[];
} => {
  return useMemo(() => {
    const datasourceState = datasourceStates[datasourceId].state;

    if (!isSingleLayerVisualization || textBasedMode || !datasourceState) {
      return { isConvertToEsqlButtonDisabled: true, convertibleLayers: [] };
    }

    // Validate datasourceState structure
    if (
      typeof datasourceState !== 'object' ||
      datasourceState === null ||
      !('layers' in datasourceState) ||
      !datasourceState.layers
    ) {
      return { isConvertToEsqlButtonDisabled: true, convertibleLayers: [] };
    }

    // Access the single layer safely
    const layers = datasourceState.layers as Record<string, FormBasedLayer>;
    const layerId = layerIds[0];

    if (!layerId || !(layerId in layers)) {
      return { isConvertToEsqlButtonDisabled: true, convertibleLayers: [] };
    }

    const singleLayer = layers[layerId];
    if (!singleLayer || !singleLayer.columnOrder || !singleLayer.columns) {
      return { isConvertToEsqlButtonDisabled: true, convertibleLayers: [] };
    }

    // Get the esAggEntries
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
      isConvertToEsqlButtonDisabled: !esqlLayer,
      convertibleLayers: [convertibleLayer],
    };
  }, [
    coreStart.uiSettings,
    datasourceId,
    datasourceStates,
    framePublicAPI.dataViews.indexPatterns,
    framePublicAPI.dateRange,
    isSingleLayerVisualization,
    layerIds,
    startDependencies.data.nowProvider,
    textBasedMode,
  ]);
};
