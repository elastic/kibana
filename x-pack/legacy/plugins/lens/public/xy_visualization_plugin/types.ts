/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Position } from '@elastic/charts';
import {
  ExpressionFunction,
  ArgumentType,
} from '../../../../../../src/legacy/core_plugins/interpreter/public';

export interface LegendConfig {
  isVisible: boolean;
  position: Position;
}

type LegendConfigResult = LegendConfig & { type: 'lens_xy_legendConfig' };

export const legendConfig: ExpressionFunction<
  'lens_xy_legendConfig',
  null,
  LegendConfig,
  LegendConfigResult
> = {
  name: 'lens_xy_legendConfig',
  aliases: [],
  type: 'lens_xy_legendConfig',
  help: `Configure the xy chart's legend`,
  context: {
    types: ['null'],
  },
  args: {
    isVisible: {
      types: ['boolean'],
      help: 'Specifies whether or not the legend is visible.',
    },
    position: {
      types: ['string'],
      options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
      help: 'Specifies the legend position.',
    },
  },
  fn: function fn(_context: unknown, args: LegendConfig) {
    return {
      type: 'lens_xy_legendConfig',
      ...args,
    };
  },
};

interface AxisConfig {
  title: string;
  showGridlines: boolean;
  position: Position;
  hide?: boolean;
}

const axisConfig: { [key in keyof AxisConfig]: ArgumentType<AxisConfig[key]> } = {
  title: {
    types: ['string'],
    help: 'The axis title',
  },
  showGridlines: {
    types: ['boolean'],
    help: 'Show / hide axis grid lines.',
  },
  position: {
    types: ['string'],
    options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
    help: 'The position of the axis',
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

export const xConfig: ExpressionFunction<'lens_xy_xConfig', null, XConfig, XConfigResult> = {
  name: 'lens_xy_xConfig',
  aliases: [],
  type: 'lens_xy_xConfig',
  help: `Configure the xy chart's x axis`,
  context: {
    types: ['null'],
  },
  args: {
    ...axisConfig,
    accessor: {
      types: ['string'],
      help: 'The column to display on the x axis.',
    },
  },
  fn: function fn(_context: unknown, args: XConfig) {
    return {
      type: 'lens_xy_xConfig',
      ...args,
    };
  },
};

type LayerConfigResult = LayerConfig & { type: 'lens_xy_layer' };

export const layerConfig: ExpressionFunction<
  'lens_xy_layer',
  null,
  LayerConfig,
  LayerConfigResult
> = {
  name: 'lens_xy_layer',
  aliases: [],
  type: 'lens_xy_layer',
  help: `Configure a layer in the xy chart`,
  context: {
    types: ['null'],
  },
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
      options: [
        'bar',
        'line',
        'area',
        'horizontal_bar',
        'bar_stacked',
        'area_stacked',
        'horizontal_bar_stacked',
      ],
      help: 'The type of chart to display.',
    },
    splitSeriesAccessors: {
      types: ['string'],
      help: 'The columns to split by',
      multi: true,
    },
    accessors: {
      types: ['string'],
      help: 'The columns to display on the y axis.',
      multi: true,
    },
    labels: {
      types: ['string'],
      help: '',
      multi: true,
    },
  },
  fn: function fn(_context: unknown, args: LayerConfig) {
    return {
      type: 'lens_xy_layer',
      ...args,
    };
  },
};

export type SeriesType =
  | 'bar'
  | 'horizontal_bar'
  | 'line'
  | 'area'
  | 'bar_stacked'
  | 'horizontal_bar_stacked'
  | 'area_stacked';

type LayerConfig = AxisConfig & {
  layerId: string;
  xAccessor: string;

  accessors: string[];
  labels: string[];
  seriesType: SeriesType;
  splitSeriesAccessors: string[];
};

export interface XYArgs {
  // seriesType: SeriesType;
  legend: LegendConfig;
  // y: YConfig;
  // x: XConfig;
  // splitSeriesAccessors: string[];
  layers: LayerConfig[];
}

export interface XYState {
  // seriesType: SeriesType;
  legend: LegendConfig;
  // y: YState;
  // x: XConfig;
  layers: LayerConfig[];
  // splitSeriesAccessors: string[];
}

export type State = XYState;
export type PersistableState = XYState;
