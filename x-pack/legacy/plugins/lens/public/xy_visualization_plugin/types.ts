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

export type YConfig = AxisConfig &
  YState & {
    labels: string[];
  };

type YConfigResult = YConfig & { type: 'lens_xy_yConfig' };

export const yConfig: ExpressionFunction<'lens_xy_yConfig', null, YConfig, YConfigResult> = {
  name: 'lens_xy_yConfig',
  aliases: [],
  type: 'lens_xy_yConfig',
  help: `Configure the xy chart's y axis`,
  context: {
    types: ['null'],
  },
  args: {
    ...axisConfig,
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
  fn: function fn(_context: unknown, args: YConfig) {
    return {
      type: 'lens_xy_yConfig',
      ...args,
    };
  },
};

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

export type SeriesType =
  | 'bar'
  | 'horizontal_bar'
  | 'line'
  | 'area'
  | 'bar_stacked'
  | 'horizontal_bar_stacked'
  | 'area_stacked';

export interface XYArgs {
  seriesType: SeriesType;
  legend: LegendConfig;
  y: YConfig;
  x: XConfig;
  splitSeriesAccessors: string[];
}

export interface XYState {
  seriesType: SeriesType;
  legend: LegendConfig;
  y: YState;
  x: XConfig;
  splitSeriesAccessors: string[];
}

export type State = XYState;
export type PersistableState = XYState;
