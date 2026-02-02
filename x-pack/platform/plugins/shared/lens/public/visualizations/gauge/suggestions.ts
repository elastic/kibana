/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  GaugeShapes,
  GaugeTicksPositions,
  GaugeLabelMajorModes,
} from '@kbn/expression-gauge-plugin/common';
import {
  IconChartGaugeCircle,
  IconChartGaugeSemiCircle,
  IconChartGaugeArc,
  IconChartHorizontalBullet,
  IconChartVerticalBullet,
} from '@kbn/chart-icons';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { TableSuggestion, Visualization, VisualizationSuggestion } from '@kbn/lens-common';
import type { PaletteRegistry } from '@kbn/coloring';
import type { GaugeVisualizationState } from './constants';
import { gaugeTitlesByType } from './constants';
import { getDefaultPalette } from './utils';

const isNotNumericMetric = (table: TableSuggestion) =>
  table.columns?.[0]?.operation.dataType !== 'number' ||
  table.columns.some((col) => col.operation.isBucketed);

const hasLayerMismatch = (keptLayerIds: string[], table: TableSuggestion) =>
  keptLayerIds.length > 1 || (keptLayerIds.length && table.layerId !== keptLayerIds[0]);

type GaugeSuggestionInput = Parameters<
  Visualization<GaugeVisualizationState>['getSuggestions']
>[0] & {
  paletteService: PaletteRegistry;
};

type GaugeSuggestionReturn = ReturnType<Visualization<GaugeVisualizationState>['getSuggestions']>;

export const getSuggestions = ({
  table,
  state,
  keptLayerIds,
  paletteService,
}: GaugeSuggestionInput): GaugeSuggestionReturn => {
  const isGauge = Boolean(
    state && (state.minAccessor || state.maxAccessor || state.goalAccessor || state.metricAccessor)
  );

  const numberOfAccessors =
    state &&
    [state.minAccessor, state.maxAccessor, state.goalAccessor, state.metricAccessor].filter(Boolean)
      .length;

  if (
    hasLayerMismatch(keptLayerIds, table) ||
    isNotNumericMetric(table) ||
    (state && !isGauge && table.columns.length > 1) ||
    (isGauge && (numberOfAccessors !== table.columns.length || table.changeType === 'initial'))
  ) {
    return [];
  }

  const baseSuggestion: VisualizationSuggestion<GaugeVisualizationState> = {
    state: {
      ...state,
      shape: state?.shape ?? GaugeShapes.HORIZONTAL_BULLET,
      layerId: table.layerId,
      layerType: LayerTypes.DATA,
      ticksPosition: GaugeTicksPositions.BANDS,
      labelMajorMode: GaugeLabelMajorModes.AUTO,
      colorMode: 'palette',
      palette: getDefaultPalette(paletteService),
    },
    title: i18n.translate('xpack.lens.gauge.gaugeLabel', {
      defaultMessage: 'Gauge',
    }),
    previewIcon: IconChartHorizontalBullet,
    score: 0.5,
    hide: !isGauge || state?.metricAccessor === undefined, // only display for gauges for beta
    incomplete: state?.metricAccessor === undefined,
  };

  const suggestions: Array<VisualizationSuggestion<GaugeVisualizationState>> = isGauge
    ? [
        {
          ...baseSuggestion,
          title: gaugeTitlesByType.verticalBullet,
          previewIcon: IconChartVerticalBullet,
          state: {
            ...baseSuggestion.state,
            ...state,
            shape: GaugeShapes.VERTICAL_BULLET,
          },
          score: 1,
        },
        {
          ...baseSuggestion,
          title: gaugeTitlesByType.horizontalBullet,
          previewIcon: IconChartHorizontalBullet,
          state: {
            ...baseSuggestion.state,
            ...state,
            shape: GaugeShapes.HORIZONTAL_BULLET,
          },
          score: 1,
        },
        {
          ...baseSuggestion,
          title: gaugeTitlesByType.semiCircle,
          previewIcon: IconChartGaugeSemiCircle,
          state: {
            ...baseSuggestion.state,
            ...state,
            shape: GaugeShapes.SEMI_CIRCLE,
          },
          score: 0.1,
        },
        {
          ...baseSuggestion,
          title: gaugeTitlesByType.arc,
          previewIcon: IconChartGaugeArc,
          state: {
            ...baseSuggestion.state,
            ...state,
            shape: GaugeShapes.ARC,
          },
        },
        {
          ...baseSuggestion,
          title: gaugeTitlesByType.circle,
          previewIcon: IconChartGaugeCircle,
          state: {
            ...baseSuggestion.state,
            ...state,
            shape: GaugeShapes.CIRCLE,
          },
          score: 0.1,
        },
      ].filter((s) => s.state.shape !== state?.shape)
    : [
        {
          ...baseSuggestion,
          state: {
            ...baseSuggestion.state,
            metricAccessor: table.columns[0].columnId,
          },
        },
        {
          ...baseSuggestion,
          previewIcon:
            state?.shape === GaugeShapes.VERTICAL_BULLET
              ? IconChartHorizontalBullet
              : IconChartVerticalBullet,
          state: {
            ...baseSuggestion.state,
            metricAccessor: table.columns[0].columnId,
            shape:
              state?.shape === GaugeShapes.VERTICAL_BULLET
                ? GaugeShapes.HORIZONTAL_BULLET
                : GaugeShapes.VERTICAL_BULLET,
          },
        },
      ];

  return suggestions;
};
