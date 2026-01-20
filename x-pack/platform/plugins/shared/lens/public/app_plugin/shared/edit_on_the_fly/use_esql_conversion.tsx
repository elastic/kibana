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
import {
  getESQLForLayer,
  isEsqlQuerySuccess,
  type EsqlConversionFailureReason,
} from '../../../datasources/form_based/to_esql';
import type { ConvertibleLayer } from './convert_to_esql_modal';
import { operationDefinitionMap } from '../../../datasources/form_based/operations';
import type { LensPluginStartDependencies } from '../../../plugin';
import { layerTypes } from '../../..';

const cannotConvertToEsqlTooltip = i18n.translate('xpack.lens.config.cannotConvertToEsqlTooltip', {
  defaultMessage: 'This visualization cannot be converted to ES|QL',
});

const failureReasonMessages: Record<EsqlConversionFailureReason, string> = {
  non_utc_timezone: i18n.translate('xpack.lens.config.cannotConvertToEsqlNonUtcTimezone', {
    defaultMessage: 'Cannot convert to ES|QL: UTC timezone is required.',
  }),
  formula_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlFormula', {
    defaultMessage: 'Cannot convert to ES|QL: Formula operations are not yet supported.',
  }),
  time_shift_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlTimeShift', {
    defaultMessage: 'Cannot convert to ES|QL: Time shift is not yet supported.',
  }),
  runtime_field_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlRuntimeField', {
    defaultMessage: 'Cannot convert to ES|QL: Runtime fields are not yet supported.',
  }),
  reduced_time_range_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlReducedTimeRange',
    {
      defaultMessage: 'Cannot convert to ES|QL: Reduced time range is not yet supported.',
    }
  ),
  function_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlOperation', {
    defaultMessage: 'Cannot convert to ES|QL: One or more functions are not yet supported.',
  }),
  drop_partials_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlDropPartials', {
    defaultMessage: 'Cannot convert to ES|QL: "Drop partial buckets" option is not yet supported.',
  }),
  include_empty_rows_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlIncludeEmptyRows',
    {
      defaultMessage: 'Cannot convert to ES|QL: "Include empty rows" option is not yet supported.',
    }
  ),
  terms_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlTerms', {
    defaultMessage: 'Cannot convert to ES|QL: Top values (terms) aggregation is not yet supported.',
  }),
  unknown: i18n.translate('xpack.lens.config.cannotConvertToEsqlUnknown', {
    defaultMessage: 'Cannot convert to ES|QL: This visualization has unsupported settings.',
  }),
};

const getFailureTooltip = (reason: EsqlConversionFailureReason | undefined): string => {
  if (!reason) {
    return cannotConvertToEsqlTooltip;
  }
  return failureReasonMessages[reason] ?? failureReasonMessages.unknown;
};

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

    return isEsqlQuerySuccess(esqlLayer)
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
      : getEsqlConversionDisabledSettings(getFailureTooltip(esqlLayer?.reason));
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
