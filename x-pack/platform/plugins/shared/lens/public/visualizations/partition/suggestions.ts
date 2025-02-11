/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import type {
  SuggestionRequest,
  TableSuggestionColumn,
  VisualizationSuggestion,
} from '../../types';
import { PieVisualizationState } from '../../../common/types';
import {
  CategoryDisplay,
  LegendDisplay,
  NumberDisplay,
  PieChartTypes,
} from '../../../common/constants';
import { isPartitionShape } from '../../../common/visualizations';
import type { PieChartType } from '../../../common/types';
import { PartitionChartsMeta } from './partition_charts_meta';
import { layerTypes } from '../..';
import { getColorMappingDefaults } from '../../utils';

function hasIntervalScale(columns: TableSuggestionColumn[]) {
  return columns.some((col) => col.operation.scale === 'interval');
}

function shouldReject({ table, keptLayerIds, state }: SuggestionRequest<PieVisualizationState>) {
  return (
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
    table.changeType === 'reorder' ||
    table.columns.some((col) => col.operation.isStaticValue)
  );
}

function getNewShape(
  subVisualizationId?: PieVisualizationState['shape'],
  currentShape?: PieVisualizationState['shape']
) {
  if (subVisualizationId) {
    return subVisualizationId;
  }

  if (currentShape) {
    return currentShape;
  }

  return PieChartTypes.PIE;
}

function hasCustomSuggestionsExists(shape: PieChartType | string | undefined) {
  const shapes: Array<PieChartType | string> = [
    PieChartTypes.TREEMAP,
    PieChartTypes.WAFFLE,
    PieChartTypes.MOSAIC,
  ];
  return shape ? shapes.includes(shape) : false;
}

const maximumGroupLength = Math.max(
  ...Object.values(PartitionChartsMeta).map(({ maxBuckets }) => maxBuckets)
);

export function suggestions({
  table,
  state,
  keptLayerIds,
  mainPalette,
  subVisualizationId,
}: SuggestionRequest<PieVisualizationState>): Array<
  VisualizationSuggestion<PieVisualizationState>
> {
  if (shouldReject({ table, state, keptLayerIds })) {
    return [];
  }

  const isActive = Boolean(state);

  const [groups, metrics] = partition(
    // filter out all metrics which are not number based
    table.columns.filter((col) => col.operation.isBucketed || col.operation.dataType === 'number'),
    (col) => col.operation.isBucketed
  );

  if (groups.length === 0 && metrics.length === 0) {
    return [];
  }

  if ((metrics.length > 1 && !isActive) || groups.length > maximumGroupLength) {
    return [];
  }

  if (metrics.length > 1 && !state?.layers[0].allowMultipleMetrics) {
    return [];
  }

  const incompleteConfiguration = metrics.length === 0 || groups.length === 0;

  if (incompleteConfiguration && state && !subVisualizationId) {
    // reject incomplete configurations if the sub visualization isn't specifically requested
    // this allows to switch chart types via switcher with incomplete configurations, but won't
    // cause incomplete suggestions getting auto applied on dropped fields
    return [];
  }

  const metricColumnIds = metrics.map(({ columnId }) => columnId);

  const results: Array<VisualizationSuggestion<PieVisualizationState>> = [];

  // Histograms are not good for pi. But we should not hide suggestion on switching between partition charts.
  const shouldHideSuggestion =
    state?.shape && isPartitionShape(state.shape) ? false : hasIntervalScale(table.columns);

  if (
    groups.length <= PartitionChartsMeta.pie.maxBuckets &&
    !hasCustomSuggestionsExists(subVisualizationId)
  ) {
    const newShape = getNewShape(
      subVisualizationId as PieVisualizationState['shape'],
      state?.shape
    );
    const baseSuggestion: VisualizationSuggestion<PieVisualizationState> = {
      title: i18n.translate('xpack.lens.pie.suggestionLabel', {
        defaultMessage: '{chartName}',
        values: { chartName: PartitionChartsMeta[newShape].label },
        description: 'chartName is already translated',
      }),
      score: state && !hasCustomSuggestionsExists(state.shape) ? 0.6 : 0.4,
      state: {
        shape: newShape,
        palette: mainPalette?.type === 'legacyPalette' ? mainPalette.value : state?.palette,
        layers: [
          state?.layers[0]
            ? {
                ...state.layers[0],
                layerId: table.layerId,
                primaryGroups: groups.map((col) => col.columnId),
                metrics: metricColumnIds,
                layerType: layerTypes.DATA,
                colorMapping: !mainPalette
                  ? getColorMappingDefaults()
                  : mainPalette?.type === 'colorMapping'
                  ? mainPalette.value
                  : state.layers[0].colorMapping,
              }
            : {
                layerId: table.layerId,
                primaryGroups: groups.map((col) => col.columnId),
                metrics: metricColumnIds,
                numberDisplay: NumberDisplay.PERCENT,
                categoryDisplay: CategoryDisplay.DEFAULT,
                legendDisplay: LegendDisplay.DEFAULT,
                nestedLegend: false,
                layerType: layerTypes.DATA,
                colorMapping: !mainPalette
                  ? getColorMappingDefaults()
                  : mainPalette?.type === 'colorMapping'
                  ? mainPalette.value
                  : undefined,
              },
        ],
      },
      previewIcon: PartitionChartsMeta[newShape].icon,
      // dont show suggestions for same type
      hide:
        table.changeType === 'reduced' ||
        hasIntervalScale(groups) ||
        (state && !hasCustomSuggestionsExists(state.shape)),
    };

    results.push(baseSuggestion);
    results.push({
      ...baseSuggestion,
      title: i18n.translate('xpack.lens.pie.suggestionLabel', {
        defaultMessage: '{chartName}',
        values: {
          chartName:
            PartitionChartsMeta[
              newShape === PieChartTypes.PIE ? PieChartTypes.DONUT : PieChartTypes.PIE
            ].label,
        },
        description: 'chartName is already translated',
      }),
      score: 0.1,
      state: {
        ...baseSuggestion.state,
        shape: newShape === PieChartTypes.PIE ? PieChartTypes.DONUT : PieChartTypes.PIE,
      },
      hide: true,
    });
  }

  if (
    groups.length <= PartitionChartsMeta.treemap.maxBuckets &&
    (!subVisualizationId || subVisualizationId === PieChartTypes.TREEMAP)
  ) {
    results.push({
      title: i18n.translate('xpack.lens.pie.treemapSuggestionLabel', {
        defaultMessage: 'Treemap',
      }),
      // Use a higher score when currently active, to prevent chart type switching
      // on the user unintentionally
      score: state?.shape === PieChartTypes.TREEMAP ? 0.7 : 0.5,
      state: {
        shape: PieChartTypes.TREEMAP,
        palette: mainPalette?.type === 'legacyPalette' ? mainPalette.value : state?.palette,
        layers: [
          state?.layers[0]
            ? {
                ...state.layers[0],
                layerId: table.layerId,
                primaryGroups: groups.map((col) => col.columnId),
                metrics: metricColumnIds,
                categoryDisplay:
                  state.layers[0].categoryDisplay === CategoryDisplay.INSIDE
                    ? CategoryDisplay.DEFAULT
                    : state.layers[0].categoryDisplay,
                layerType: layerTypes.DATA,
                colorMapping:
                  mainPalette?.type === 'colorMapping'
                    ? mainPalette.value
                    : state.layers[0].colorMapping,
              }
            : {
                layerId: table.layerId,
                primaryGroups: groups.map((col) => col.columnId),
                metrics: metricColumnIds,
                numberDisplay: NumberDisplay.PERCENT,
                categoryDisplay: CategoryDisplay.DEFAULT,
                legendDisplay: LegendDisplay.DEFAULT,
                nestedLegend: false,
                layerType: layerTypes.DATA,
                colorMapping: mainPalette?.type === 'colorMapping' ? mainPalette.value : undefined,
              },
        ],
      },
      previewIcon: PartitionChartsMeta.treemap.icon,
      hide: table.changeType === 'reduced' || hasIntervalScale(groups),
    });
  }

  if (
    groups.length <= PartitionChartsMeta.mosaic.maxBuckets &&
    (!subVisualizationId || subVisualizationId === PieChartTypes.MOSAIC)
  ) {
    results.push({
      title: i18n.translate('xpack.lens.pie.mosaicSuggestionLabel', {
        defaultMessage: 'Mosaic',
      }),
      score: state?.shape === PieChartTypes.MOSAIC ? 0.7 : 0.5,
      state: {
        shape: PieChartTypes.MOSAIC,
        palette: mainPalette?.type === 'legacyPalette' ? mainPalette.value : state?.palette,
        layers: [
          state?.layers[0]
            ? {
                ...state.layers[0],
                layerId: table.layerId,
                primaryGroups: groups[0] ? [groups[0].columnId] : [],
                secondaryGroups: groups[1] ? [groups[1].columnId] : [],
                metrics: metricColumnIds,
                categoryDisplay: CategoryDisplay.DEFAULT,
                layerType: layerTypes.DATA,
                allowMultipleMetrics: false,
                colorMapping:
                  mainPalette?.type === 'colorMapping'
                    ? mainPalette.value
                    : state.layers[0].colorMapping,
              }
            : {
                layerId: table.layerId,
                primaryGroups: groups[0] ? [groups[0].columnId] : [],
                secondaryGroups: groups[1] ? [groups[1].columnId] : [],
                metrics: metricColumnIds,
                numberDisplay: NumberDisplay.PERCENT,
                categoryDisplay: CategoryDisplay.DEFAULT,
                legendDisplay: LegendDisplay.DEFAULT,
                nestedLegend: false,
                layerType: layerTypes.DATA,
                allowMultipleMetrics: false,
                colorMapping: mainPalette?.type === 'colorMapping' ? mainPalette.value : undefined,
              },
        ],
      },
      previewIcon: PartitionChartsMeta.mosaic.icon,
      hide: groups.length !== 2 || table.changeType === 'reduced' || hasIntervalScale(groups),
    });
  }

  if (
    groups.length <= PartitionChartsMeta.waffle.maxBuckets &&
    (!subVisualizationId || subVisualizationId === PieChartTypes.WAFFLE)
  ) {
    results.push({
      title: i18n.translate('xpack.lens.pie.waffleSuggestionLabel', {
        defaultMessage: 'Waffle',
      }),
      score: state?.shape === PieChartTypes.WAFFLE ? 0.7 : 0.4,
      state: {
        shape: PieChartTypes.WAFFLE,
        palette: mainPalette?.type === 'legacyPalette' ? mainPalette.value : state?.palette,
        layers: [
          state?.layers[0]
            ? {
                ...state.layers[0],
                layerId: table.layerId,
                primaryGroups: groups.map((col) => col.columnId),
                metrics: metricColumnIds,
                secondaryGroups: [],
                categoryDisplay: CategoryDisplay.DEFAULT,
                layerType: layerTypes.DATA,
                colorMapping:
                  mainPalette?.type === 'colorMapping'
                    ? mainPalette.value
                    : state.layers[0].colorMapping,
              }
            : {
                layerId: table.layerId,
                primaryGroups: groups.map((col) => col.columnId),
                metrics: metricColumnIds,
                numberDisplay: NumberDisplay.PERCENT,
                categoryDisplay: CategoryDisplay.DEFAULT,
                legendDisplay: LegendDisplay.DEFAULT,
                nestedLegend: false,
                layerType: layerTypes.DATA,
                colorMapping: mainPalette?.type === 'colorMapping' ? mainPalette.value : undefined,
              },
        ],
      },
      previewIcon: PartitionChartsMeta.waffle.icon,
      hide: groups.length !== 1 || table.changeType === 'reduced' || hasIntervalScale(groups),
    });
  }

  return [...results]
    .map((suggestion) => ({
      ...suggestion,
      score: shouldHideSuggestion
        ? 0
        : suggestion.score + 0.05 * groups.length + 0.01 * metricColumnIds.length,
    }))
    .sort((a, b) => b.score - a.score)
    .map((suggestion) => ({
      ...suggestion,
      hide:
        // avoid to suggest the same shape if already used
        (state && state.shape === suggestion.state.shape) ||
        shouldHideSuggestion ||
        incompleteConfiguration ||
        suggestion.hide,
      incomplete: incompleteConfiguration,
    }));
}
