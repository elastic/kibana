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
  RecursivePartial,
  BarSeriesStyle,
  AreaSeriesStyle,
} from '@elastic/charts';
import { InfraMetricLayoutVisualizationType } from '../../../pages/metrics/layouts/types';
import { InfraDataSeries } from '../../../graphql/types';

interface Props {
  id: string;
  name: string;
  color?: string | undefined;
  series: InfraDataSeries;
  type: InfraMetricLayoutVisualizationType;
  stack?: boolean | undefined;
  ignoreGaps?: boolean | undefined;
}

export const SeriesChart = (props: Props) => {
  if (props.type === InfraMetricLayoutVisualizationType.bar) {
    return <BarChart {...props} />;
  }
  return <AreaChart {...props} />;
};

export const AreaChart = ({ id, color, series, name, type, stack, ignoreGaps }: Props) => {
  const style: RecursivePartial<AreaSeriesStyle> = {
    area: {
      opacity: 1,
      visible: InfraMetricLayoutVisualizationType.area === type,
    },
    line: {
      strokeWidth: InfraMetricLayoutVisualizationType.area === type ? 1 : 2,
      visible: true,
    },
    point: {
      visible: false,
      radius: 0.2,
      strokeWidth: 2,
      opacity: 1,
    },
  };
  const colors: DataSeriesColorsValues = {
    colorValues: [],
    specId: getSpecId(id),
  };
  const customColors: CustomSeriesColorsMap = new Map();
  customColors.set(colors, color || '');
  const data = ignoreGaps ? series.data.filter(d => d.value) : series.data;
  return (
    <AreaSeries
      id={getSpecId(id)}
      name={name}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={['value']}
      data={data}
      areaSeriesStyle={style}
      customSeriesColors={color ? customColors : void 0}
      stackAccessors={stack ? ['timestamp'] : void 0}
    />
  );
};

export const BarChart = ({ id, color, series, name, stack, ignoreGaps }: Props) => {
  const style: RecursivePartial<BarSeriesStyle> = {
    rectBorder: {
      visible: false,
      strokeWidth: 2,
      stroke: color || '',
    },
    rect: {
      opacity: 1,
    },
  };
  const colors: DataSeriesColorsValues = {
    colorValues: [],
    specId: getSpecId(id),
  };
  const customColors: CustomSeriesColorsMap = new Map();
  customColors.set(colors, color || '');
  const data = ignoreGaps ? series.data.filter(d => d.value) : series.data;
  return (
    <BarSeries
      id={getSpecId(id)}
      name={name}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={['value']}
      data={data}
      barSeriesStyle={style}
      customSeriesColors={color ? customColors : void 0}
      stackAccessors={stack ? ['timestamp'] : void 0}
    />
  );
};
