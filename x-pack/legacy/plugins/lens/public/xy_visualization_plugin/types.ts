/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { ArgumentType, ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import chartAreaSVG from '../assets/chart_area.svg';
import chartAreaStackedSVG from '../assets/chart_area_stacked.svg';
import chartBarSVG from '../assets/chart_bar.svg';
import chartBarStackedSVG from '../assets/chart_bar_stacked.svg';
import chartBarHorizontalSVG from '../assets/chart_bar_horizontal.svg';
import chartBarHorizontalStackedSVG from '../assets/chart_bar_horizontal_stacked.svg';
import chartLineSVG from '../assets/chart_line.svg';

import { VisualizationType } from '..';

export interface LegendConfig {
  isVisible: boolean;
  position: Position;
}

type LegendConfigResult = LegendConfig & { type: 'lens_xy_legendConfig' };

export const legendConfig: ExpressionFunctionDefinition<
  'lens_xy_legendConfig',
  null,
  LegendConfig,
  LegendConfigResult
> = {
  name: 'lens_xy_legendConfig',
  aliases: [],
  type: 'lens_xy_legendConfig',
  help: `Configure the xy chart's legend`,
  inputTypes: ['null'],
  args: {
    isVisible: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.xyChart.isVisible.help', {
        defaultMessage: 'Specifies whether or not the legend is visible.',
      }),
    },
    position: {
      types: ['string'],
      options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
      help: i18n.translate('xpack.lens.xyChart.position.help', {
        defaultMessage: 'Specifies the legend position.',
      }),
    },
  },
  fn: function fn(input: unknown, args: LegendConfig) {
    return {
      type: 'lens_xy_legendConfig',
      ...args,
    };
  },
};

interface AxisConfig {
  title: string;
  hide?: boolean;
}

const axisConfig: { [key in keyof AxisConfig]: ArgumentType<AxisConfig[key]> } = {
  title: {
    types: ['string'],
    help: i18n.translate('xpack.lens.xyChart.title.help', {
      defaultMessage: 'The axis title',
    }),
  },
  hide: {
    types: ['boolean'],
    default: false,
    help: 'Show / hide axis',
  },
};

export interface YState extends AxisConfig {
  accessors: string[];
}

export interface XConfig extends AxisConfig {
  accessor: string;
}

type XConfigResult = XConfig & { type: 'lens_xy_xConfig' };

export const xConfig: ExpressionFunctionDefinition<
  'lens_xy_xConfig',
  null,
  XConfig,
  XConfigResult
> = {
  name: 'lens_xy_xConfig',
  aliases: [],
  type: 'lens_xy_xConfig',
  help: `Configure the xy chart's x axis`,
  inputTypes: ['null'],
  args: {
    ...axisConfig,
    accessor: {
      types: ['string'],
      help: 'The column to display on the x axis.',
    },
  },
  fn: function fn(input: unknown, args: XConfig) {
    return {
      type: 'lens_xy_xConfig',
      ...args,
    };
  },
};

type LayerConfigResult = LayerArgs & { type: 'lens_xy_layer' };

export const layerConfig: ExpressionFunctionDefinition<
  'lens_xy_layer',
  null,
  LayerArgs,
  LayerConfigResult
> = {
  name: 'lens_xy_layer',
  aliases: [],
  type: 'lens_xy_layer',
  help: `Configure a layer in the xy chart`,
  inputTypes: ['null'],
  args: {
    ...axisConfig,
    layerId: {
      types: ['string'],
      help: '',
    },
    xAccessor: {
      types: ['string'],
      help: '',
    },
    seriesType: {
      types: ['string'],
      options: ['bar', 'line', 'area', 'bar_stacked', 'area_stacked'],
      help: 'The type of chart to display.',
    },
    xScaleType: {
      options: ['ordinal', 'linear', 'time'],
      help: 'The scale type of the x axis',
      default: 'ordinal',
    },
    isHistogram: {
      types: ['boolean'],
      default: false,
      help: 'Whether to layout the chart as a histogram',
    },
    yScaleType: {
      options: ['log', 'sqrt', 'linear', 'time'],
      help: 'The scale type of the y axes',
      default: 'linear',
    },
    splitAccessor: {
      types: ['string'],
      help: 'The column to split by',
      multi: false,
    },
    accessors: {
      types: ['string'],
      help: 'The columns to display on the y axis.',
      multi: true,
    },
    columnToLabel: {
      types: ['string'],
      help: 'JSON key-value pairs of column ID to label',
    },
  },
  fn: function fn(input: unknown, args: LayerArgs) {
    return {
      type: 'lens_xy_layer',
      ...args,
    };
  },
};

export type SeriesType =
  | 'bar'
  | 'bar_horizontal'
  | 'line'
  | 'area'
  | 'bar_stacked'
  | 'bar_horizontal_stacked'
  | 'area_stacked';

export interface LayerConfig {
  hide?: boolean;
  layerId: string;
  xAccessor: string;
  accessors: string[];
  seriesType: SeriesType;
  splitAccessor: string;
}

export type LayerArgs = LayerConfig & {
  columnToLabel?: string; // Actually a JSON key-value pair
  yScaleType: 'time' | 'linear' | 'log' | 'sqrt';
  xScaleType: 'time' | 'linear' | 'ordinal';
  isHistogram: boolean;
};

// Arguments to XY chart expression, with computed properties
export interface XYArgs {
  xTitle: string;
  yTitle: string;
  legend: LegendConfig & { type: 'lens_xy_legendConfig' };
  layers: LayerArgs[];
}

// Persisted parts of the state
export interface XYState {
  preferredSeriesType: SeriesType;
  legend: LegendConfig;
  layers: LayerConfig[];
}

export type State = XYState;
export type PersistableState = XYState;

export const visualizationTypes: VisualizationType[] = [
  {
    id: 'bar',
    icon: 'visBarVertical',
    largeIcon: chartBarSVG,
    label: i18n.translate('xpack.lens.xyVisualization.barLabel', {
      defaultMessage: 'Bar',
    }),
  },
  {
    id: 'bar_horizontal',
    icon: 'visBarHorizontal',
    largeIcon: chartBarHorizontalSVG,
    label: i18n.translate('xpack.lens.xyVisualization.barHorizontalLabel', {
      defaultMessage: 'Horizontal bar',
    }),
  },
  {
    id: 'bar_stacked',
    icon: 'visBarVerticalStacked',
    largeIcon: chartBarStackedSVG,
    label: i18n.translate('xpack.lens.xyVisualization.stackedBarLabel', {
      defaultMessage: 'Stacked bar',
    }),
  },
  {
    id: 'bar_horizontal_stacked',
    icon: 'visBarHorizontalStacked',
    largeIcon: chartBarHorizontalStackedSVG,
    label: i18n.translate('xpack.lens.xyVisualization.stackedBarHorizontalLabel', {
      defaultMessage: 'Stacked horizontal bar',
    }),
  },
  {
    id: 'line',
    icon: 'visLine',
    largeIcon: chartLineSVG,
    label: i18n.translate('xpack.lens.xyVisualization.lineLabel', {
      defaultMessage: 'Line',
    }),
  },
  {
    id: 'area',
    icon: 'visArea',
    largeIcon: chartAreaSVG,
    label: i18n.translate('xpack.lens.xyVisualization.areaLabel', {
      defaultMessage: 'Area',
    }),
  },
  {
    id: 'area_stacked',
    icon: 'visAreaStacked',
    largeIcon: chartAreaStackedSVG,
    label: i18n.translate('xpack.lens.xyVisualization.stackedAreaLabel', {
      defaultMessage: 'Stacked area',
    }),
  },
];
