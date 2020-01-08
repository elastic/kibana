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
  RecursivePartial,
  BarSeriesStyle,
  AreaSeriesStyle,
} from '@elastic/charts';
import { InfraDataSeries } from '../../../graphql/types';
import { InventoryVisType } from '../../../../common/inventory_models/types';

interface Props {
  id: string;
  name: string;
  color: string | null;
  series: InfraDataSeries;
  type: InventoryVisType;
  stack: boolean | undefined;
}

export const SeriesChart = (props: Props) => {
  if (props.type === 'bar') {
    return <BarChart {...props} />;
  }
  return <AreaChart {...props} />;
};

export const AreaChart = ({ id, color, series, name, type, stack }: Props) => {
  const style: RecursivePartial<AreaSeriesStyle> = {
    area: {
      opacity: 1,
      visible: 'area' === type,
    },
    line: {
      strokeWidth: 'area' === type ? 1 : 2,
      visible: true,
    },
  };
  return (
    <AreaSeries
      id={id}
      name={name}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={['value']}
      data={series.data}
      areaSeriesStyle={style}
      customSeriesColors={color ? [color] : void 0}
      stackAccessors={stack ? ['timestamp'] : void 0}
    />
  );
};

export const BarChart = ({ id, color, series, name, type, stack }: Props) => {
  const style: RecursivePartial<BarSeriesStyle> = {
    rectBorder: {
      stroke: color || void 0,
      strokeWidth: 1,
      visible: true,
    },
    rect: {
      opacity: 1,
    },
  };
  return (
    <BarSeries
      id={id}
      name={name}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={['value']}
      data={series.data}
      barSeriesStyle={style}
      customSeriesColors={color ? [color] : void 0}
      stackAccessors={stack ? ['timestamp'] : void 0}
    />
  );
};
