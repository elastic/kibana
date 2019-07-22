/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  AreaSeries,
  BarSeries,
  ScaleType,
  getSpecId,
  DataSeriesColorsValues,
  CustomSeriesColorsMap,
} from '@elastic/charts';
import { InfraMetricLayoutVisualizationType } from '../../../pages/metrics/layouts/types';
import { InfraDataSeries } from '../../../graphql/types';

interface Props {
  id: string;
  name: string;
  color: string;
  series: InfraDataSeries;
  type: InfraMetricLayoutVisualizationType;
  stack: boolean | undefined;
}

export const SeriesChart = (props: Props) => {
  if (props.type === InfraMetricLayoutVisualizationType.bar) {
    return <BarChart {...props} />;
  }
  return <AreaChart {...props} />;
};

export const AreaChart = ({ id, color, series, name, type, stack }: Props) => {
  const style = {
    area: {
      fill: color,
      opacity: 1,
      visible: InfraMetricLayoutVisualizationType.area === type,
    },
    line: {
      stroke: color,
      strokeWidth: InfraMetricLayoutVisualizationType.area === type ? 1 : 2,
      visible: true,
    },
    border: {
      visible: false,
      strokeWidth: 2,
      stroke: color,
    },
    point: {
      visible: false,
      radius: 0.2,
      stroke: color,
      strokeWidth: 2,
      opacity: 1,
    },
  };
  const colors: DataSeriesColorsValues = {
    colorValues: [],
    specId: getSpecId(id),
  };
  const customColors: CustomSeriesColorsMap = new Map();
  customColors.set(colors, color);
  return (
    <AreaSeries
      id={getSpecId(id)}
      name={name}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={['value']}
      data={series.data}
      areaSeriesStyle={style}
      customSeriesColors={customColors}
      stackAccessors={stack ? ['timestamp'] : void 0}
    />
  );
};

export const BarChart = ({ id, color, series, name, type, stack }: Props) => {
  const style = {
    rectBorder: {
      stroke: color,
      strokeWidth: 1,
      visible: true,
    },
    border: {
      visible: false,
      strokeWidth: 2,
      stroke: color,
    },
    rect: {
      fill: color,
      opacity: 1,
    },
  };
  const colors: DataSeriesColorsValues = {
    colorValues: [],
    specId: getSpecId(id),
  };
  const customColors: CustomSeriesColorsMap = new Map();
  customColors.set(colors, color);
  return (
    <BarSeries
      id={getSpecId(id)}
      name={name}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={['value']}
      data={series.data}
      barSeriesStyle={style}
      customSeriesColors={customColors}
      stackAccessors={stack ? ['timestamp'] : void 0}
    />
  );
};
