/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment } from 'react';
import { Axis, Position, timeFormatter, niceTimeFormatByDay } from '@elastic/charts';
import { getYRange } from './utils';
import type { LineChartPoint } from '../../../../common/chart_loader';

const dateFormatter = timeFormatter(niceTimeFormatByDay(3));

interface Props {
  chartData?: LineChartPoint[];
}

// round to 2dp
function tickFormatter(d: number): string {
  return (Math.round(d * 100) / 100).toString();
}

export const Axes: FC<Props> = ({ chartData }) => {
  const yDomain = getYRange(chartData);

  return (
    <Fragment>
      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks={true}
        tickFormat={dateFormatter}
      />
      <Axis id="left" position={Position.Left} tickFormat={tickFormatter} domain={yDomain} />
    </Fragment>
  );
};
