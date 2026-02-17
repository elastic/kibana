/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomPaletteParams, PaletteRegistry, PaletteOutput } from '@kbn/coloring';
import { CUSTOM_PALETTE, getOverridePaletteStops } from '@kbn/coloring';
import type {
  TrendlineExpressionFunctionDefinition,
  MetricVisExpressionFunctionDefinition,
} from '@kbn/expression-metric-vis-plugin/common';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import type { Ast } from '@kbn/interpreter';
import { LayoutDirection } from '@elastic/charts';
import { hasIcon } from '@kbn/visualization-ui-components';
import type { ThemeServiceStart } from '@kbn/core/public';
import type { DatasourceLayers, MetricVisualizationState } from '@kbn/lens-common';
import { LENS_LEGACY_METRIC_STATE_DEFAULTS, LENS_METRIC_STATE_DEFAULTS } from '@kbn/lens-common';
import type { CollapseArgs, CollapseFunction } from '../../../common/expressions';
import type { CollapseExpressionFunction } from '../../../common/expressions/defs/collapse/types';
import { showingBar } from './metric_visualization';
import { DEFAULT_MAX_COLUMNS, getDefaultColor } from './visualization';
import {
  getColorMode,
  getDefaultConfigForMode,
  getSecondaryLabelSelected,
  getTrendPalette,
  getSecondaryDynamicTrendBaselineValue,
} from './helpers';
import { getAccessorType } from '../../shared_components';

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
  datasourceExpressionsByLayers: Record<string, Ast> | undefined = {},
  theme: ThemeServiceStart
): Ast | null => {
  if (!state.metricAccessor) {
    return null;
  }

  const datasource = datasourceLayers[state.layerId];
  const datasourceExpression = datasourceExpressionsByLayers[state.layerId];

  const { isNumeric: isMetricNumeric } = getAccessorType(datasource, state.metricAccessor);
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

  const canCollapseBy = state.collapseFn && isMetricNumeric;

  const collapseExpressionFunction = canCollapseBy
    ? buildExpressionFunction<CollapseExpressionFunction>(
        'lens_collapse',
        getCollapseFnArguments()
      ).toAst()
    : undefined;

  const trendlineExpression = getTrendlineExpression(state, datasourceExpressionsByLayers);
  const { isNumeric: isNumericType } = getAccessorType(datasource, state.secondaryMetricAccessor);

  const secondaryDynamicColorMode = getColorMode(state.secondaryTrend, isNumericType);

  // Replace the secondary prefix if a dynamic coloring with primary metric baseline is picked
  const secondaryLabelConfig = getSecondaryLabelSelected(state, {
    defaultSecondaryLabel: '',
    colorMode: secondaryDynamicColorMode,
    isPrimaryMetricNumeric: isMetricNumeric,
  });

  const secondaryTrendConfig =
    state.secondaryTrend?.type === secondaryDynamicColorMode
      ? state.secondaryTrend
      : getDefaultConfigForMode(secondaryDynamicColorMode);

  const hasMetricIcon = hasIcon(state.icon);
  // If an icon is present but no iconAlign is set (legacy state), default to 'left' alignment;
  // otherwise, use the configured or default alignment
  let iconAlign: 'right' | 'left';
  if (hasMetricIcon) {
    // Legacy: If iconAlign is missing, default to 'left'
    iconAlign = state.iconAlign ?? LENS_LEGACY_METRIC_STATE_DEFAULTS.iconAlign;
  } else {
    iconAlign = LENS_METRIC_STATE_DEFAULTS.iconAlign;
  }

  const metricFn = buildExpressionFunction<MetricVisExpressionFunctionDefinition>('metricVis', {
    metric: state.metricAccessor,
    secondaryMetric: state.secondaryMetricAccessor,
    secondaryLabel:
      secondaryLabelConfig.mode === 'custom' ? secondaryLabelConfig.label : state.secondaryLabel,
    secondaryColor: secondaryTrendConfig.type === 'static' ? secondaryTrendConfig.color : undefined,
    secondaryTrendVisuals:
      secondaryTrendConfig.type === 'dynamic' ? secondaryTrendConfig.visuals : undefined,
    secondaryTrendBaseline:
      secondaryTrendConfig.type === 'dynamic'
        ? getSecondaryDynamicTrendBaselineValue(isMetricNumeric, secondaryTrendConfig.baselineValue)
        : undefined,
    secondaryTrendPalette: getTrendPalette(
      secondaryDynamicColorMode,
      secondaryTrendConfig,
      theme.getTheme()
    ),
    max: state.maxAccessor,
    breakdownBy:
      state.breakdownByAccessor && !canCollapseBy ? state.breakdownByAccessor : undefined,
    trendline: trendlineExpression ? [trendlineExpression] : [],
    subtitle: state.subtitle ?? undefined,
    progressDirection: showingBar(state)
      ? state.progressDirection || LayoutDirection.Vertical
      : undefined,
    titlesTextAlign: state.titlesTextAlign ?? LENS_METRIC_STATE_DEFAULTS.titlesTextAlign,
    primaryAlign: state.primaryAlign ?? LENS_METRIC_STATE_DEFAULTS.primaryAlign,
    secondaryAlign: state.secondaryAlign ?? LENS_METRIC_STATE_DEFAULTS.secondaryAlign,
    iconAlign,
    valueFontSize: state.valueFontMode ?? LENS_METRIC_STATE_DEFAULTS.valueFontMode,
    primaryPosition: state.primaryPosition ?? LENS_METRIC_STATE_DEFAULTS.primaryPosition,
    titleWeight: state.titleWeight ?? LENS_METRIC_STATE_DEFAULTS.titleWeight,
    color: state.color ?? getDefaultColor(state, isMetricNumeric),
    icon: hasMetricIcon ? state.icon : undefined,
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
    secondaryLabelPosition:
      state.secondaryLabelPosition ?? LENS_METRIC_STATE_DEFAULTS.secondaryLabelPosition,
    applyColorTo: state.applyColorTo ?? LENS_METRIC_STATE_DEFAULTS.applyColorTo,
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
