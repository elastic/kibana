/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CustomPaletteParams,
  CUSTOM_PALETTE,
  PaletteRegistry,
  PaletteOutput,
  getOverridePaletteStops,
} from '@kbn/coloring';
import type {
  TrendlineExpressionFunctionDefinition,
  MetricVisExpressionFunctionDefinition,
} from '@kbn/expression-metric-vis-plugin/common';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import { Ast } from '@kbn/interpreter';
import { LayoutDirection } from '@elastic/charts';
import { hasIcon } from '@kbn/visualization-ui-components';
import { CollapseArgs, CollapseFunction } from '../../../common/expressions';
import { CollapseExpressionFunction } from '../../../common/expressions/collapse/types';
import { DatasourceLayers } from '../../types';
import { showingBar } from './metric_visualization';
import { DEFAULT_MAX_COLUMNS, getDefaultColor } from './visualization';
import { MetricVisualizationState } from './types';
import { metricStateDefaults } from './constants';
import { isMetricNumericType } from './helpers';

// TODO - deduplicate with gauges?
function computePaletteParams(
  paletteService: PaletteRegistry,
  palette: PaletteOutput<CustomPaletteParams>
) {
  const stops = getOverridePaletteStops(paletteService, palette);

  return {
    ...palette.params,
    // rewrite colors and stops as two distinct arguments
    colors: stops?.map(({ color }) => color),
    stops: palette.params?.name === 'custom' ? stops?.map(({ stop }) => stop) : [],
    reverse: false, // managed at UI level
  };
}

const getTrendlineExpression = (
  state: MetricVisualizationState,
  datasourceExpressionsByLayers: Record<string, Ast>
): Ast | undefined => {
  const { trendlineLayerId, trendlineMetricAccessor, trendlineTimeAccessor } = state;
  if (!trendlineLayerId || !trendlineMetricAccessor || !trendlineTimeAccessor) {
    return;
  }

  const datasourceExpression = datasourceExpressionsByLayers[trendlineLayerId];

  if (!datasourceExpression) {
    return;
  }

  const metricTrendlineFn = buildExpressionFunction<TrendlineExpressionFunctionDefinition>(
    'metricTrendline',
    {
      metric: trendlineMetricAccessor,
      timeField: trendlineTimeAccessor,
      breakdownBy:
        state.trendlineBreakdownByAccessor && !state.collapseFn
          ? state.trendlineBreakdownByAccessor
          : undefined,
      inspectorTableId: trendlineLayerId,
      table: [
        {
          ...datasourceExpression,
          chain: [
            ...datasourceExpression.chain,
            ...(state.collapseFn
              ? [
                  buildExpressionFunction<CollapseExpressionFunction>('lens_collapse', {
                    by: [trendlineTimeAccessor],
                    metric: [trendlineMetricAccessor],
                    fn: [state.collapseFn],
                  }).toAst(),
                ]
              : []),
          ],
        },
      ],
    }
  );
  return buildExpression([metricTrendlineFn]).toAst();
};

export const toExpression = (
  paletteService: PaletteRegistry,
  state: MetricVisualizationState,
  datasourceLayers: DatasourceLayers,
  datasourceExpressionsByLayers: Record<string, Ast> | undefined = {}
): Ast | null => {
  if (!state.metricAccessor) {
    return null;
  }

  const datasource = datasourceLayers[state.layerId];
  const datasourceExpression = datasourceExpressionsByLayers[state.layerId];

  const isMetricNumeric = isMetricNumericType(datasource, state.metricAccessor);
  const maxPossibleTiles =
    // if there's a collapse function, no need to calculate since we're dealing with a single tile
    state.breakdownByAccessor && !state.collapseFn
      ? datasource?.getMaxPossibleNumValues(state.breakdownByAccessor)
      : null;

  const getCollapseFnArguments = (): CollapseArgs => {
    const metric = [state.metricAccessor, state.secondaryMetricAccessor, state.maxAccessor].filter(
      Boolean
    ) as string[];

    const collapseFn = state.collapseFn as CollapseFunction;

    const fn = metric.map((accessor) => {
      if (accessor !== state.maxAccessor) {
        return collapseFn;
      } else {
        const isMaxStatic = Boolean(
          datasource?.getOperationForColumnId(state.maxAccessor!)?.isStaticValue
        );
        // we do this because the user expects the static value they set to be the same
        // even if they define a collapse on the breakdown by
        return isMaxStatic ? 'max' : collapseFn;
      }
    });

    return {
      by: [],
      metric,
      fn,
    };
  };

  const collapseExpressionFunction = state.collapseFn
    ? buildExpressionFunction<CollapseExpressionFunction>(
        'lens_collapse',
        getCollapseFnArguments()
      ).toAst()
    : undefined;

  const trendlineExpression = getTrendlineExpression(state, datasourceExpressionsByLayers);

  const metricFn = buildExpressionFunction<MetricVisExpressionFunctionDefinition>('metricVis', {
    metric: state.metricAccessor,
    secondaryMetric: state.secondaryMetricAccessor,
    secondaryPrefix: state.secondaryPrefix,
    max: state.maxAccessor,
    breakdownBy:
      state.breakdownByAccessor && !state.collapseFn ? state.breakdownByAccessor : undefined,
    trendline: trendlineExpression ? [trendlineExpression] : [],
    subtitle: state.subtitle ?? undefined,
    progressDirection: showingBar(state)
      ? state.progressDirection || LayoutDirection.Vertical
      : undefined,
    titlesTextAlign: state.titlesTextAlign ?? metricStateDefaults.titlesTextAlign,
    valuesTextAlign: state.valuesTextAlign ?? metricStateDefaults.valuesTextAlign,
    iconAlign: state.iconAlign ?? metricStateDefaults.iconAlign,
    valueFontSize: state.valueFontMode ?? metricStateDefaults.valueFontMode,
    color: state.color || getDefaultColor(state, isMetricNumeric),
    icon: hasIcon(state.icon) ? state.icon : undefined,
    palette:
      isMetricNumeric && state.palette?.params
        ? [
            paletteService
              .get(CUSTOM_PALETTE)
              .toExpression(computePaletteParams(paletteService, state.palette)),
          ]
        : [],
    maxCols: state.maxCols ?? DEFAULT_MAX_COLUMNS,
    minTiles: maxPossibleTiles ?? undefined,
    inspectorTableId: state.layerId,
  });

  return {
    type: 'expression',
    chain: [
      ...(datasourceExpression?.chain ?? []),
      ...(collapseExpressionFunction ? [collapseExpressionFunction] : []),
      metricFn.toAst(),
    ],
  };
};
