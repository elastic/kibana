/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, map } from 'lodash';
import { Ticks, AxisConfig, isAxisConfig } from '../../../../types';
import { Style, PointSeriesColumns } from '../../../../../../../../src/plugins/expressions/common';

type Position = 'bottom' | 'top' | 'left' | 'right';
interface Config {
  show: boolean;
  position?: Position;
  min?: number;
  max?: number;
  tickSize?: number;
  ticks?: Array<[]>;
  mode?: 'time';
  font?: Style | {};
}

interface Options {
  columns?: PointSeriesColumns;
  ticks?: Ticks;
  font?: Style | {};
}

export const getFlotAxisConfig = (
  axis: 'x' | 'y',
  argValue: AxisConfig | boolean,
  { columns, ticks, font }: Options = {}
) => {
  if (!argValue || (isAxisConfig(argValue) && argValue.show === false)) {
    return { show: false };
  }

  const config: Config = { show: true };

  const axisType = get(columns, `${axis}.type`);

  if (isAxisConfig(argValue)) {
    const { position, min, max, tickSize } = argValue;
    // first value is used as the default
    const acceptedPositions: Position[] = axis === 'x' ? ['bottom', 'top'] : ['left', 'right'];

    config.position =
      position && acceptedPositions.includes(position) ? position : acceptedPositions[0];

    if (axisType === 'number' || axisType === 'date') {
      if (min != null) {
        config.min = min;
      }
      if (max != null) {
        config.max = max;
      }
    }

    if (tickSize && axisType === 'number') {
      config.tickSize = tickSize;
    }
  }

  if (axisType === 'string' && ticks) {
    const tickAxis = ticks[axis];
    if (tickAxis) {
      config.ticks = map<Record<string, any>, any>(tickAxis.hash, (position, name) => [
        position,
        name,
      ]);
    }
  }

  if (axisType === 'date') {
    config.mode = 'time';
  }

  if (typeof font === 'object') {
    config.font = font;
  }

  return config;
};
