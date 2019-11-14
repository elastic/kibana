/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  Chart,
  HistogramBarSeries,
  Settings,
  getAxisId,
  getSpecId,
  niceTimeFormatByDay,
  timeFormatter,
} from '@elastic/charts';
import React from 'react';
import { npStart } from 'ui/new_platform';

export const HistogramSignals = React.memo(() => {
  const sampleChartData = [
    { x: 1571090784000, y: 2, a: 'a' },
    { x: 1571090784000, y: 2, b: 'b' },
    { x: 1571093484000, y: 7, a: 'a' },
    { x: 1571096184000, y: 3, a: 'a' },
    { x: 1571098884000, y: 2, a: 'a' },
    { x: 1571101584000, y: 7, a: 'a' },
    { x: 1571104284000, y: 3, a: 'a' },
    { x: 1571106984000, y: 2, a: 'a' },
    { x: 1571109684000, y: 7, a: 'a' },
    { x: 1571112384000, y: 3, a: 'a' },
    { x: 1571115084000, y: 2, a: 'a' },
    { x: 1571117784000, y: 7, a: 'a' },
    { x: 1571120484000, y: 3, a: 'a' },
    { x: 1571123184000, y: 2, a: 'a' },
    { x: 1571125884000, y: 7, a: 'a' },
    { x: 1571128584000, y: 3, a: 'a' },
    { x: 1571131284000, y: 2, a: 'a' },
    { x: 1571133984000, y: 7, a: 'a' },
    { x: 1571136684000, y: 3, a: 'a' },
    { x: 1571139384000, y: 2, a: 'a' },
    { x: 1571142084000, y: 7, a: 'a' },
    { x: 1571144784000, y: 3, a: 'a' },
    { x: 1571147484000, y: 2, a: 'a' },
    { x: 1571150184000, y: 7, a: 'a' },
    { x: 1571152884000, y: 3, a: 'a' },
    { x: 1571155584000, y: 2, a: 'a' },
    { x: 1571158284000, y: 7, a: 'a' },
    { x: 1571160984000, y: 3, a: 'a' },
    { x: 1571163684000, y: 2, a: 'a' },
    { x: 1571166384000, y: 7, a: 'a' },
    { x: 1571169084000, y: 3, a: 'a' },
    { x: 1571171784000, y: 2, a: 'a' },
    { x: 1571174484000, y: 7, a: 'a' },
  ];

  return (
    <Chart size={['100%', 259]}>
      <Settings
        legendPosition="bottom"
        showLegend
        theme={npStart.plugins.eui_utils.useChartsTheme()}
      />

      <Axis
        id={getAxisId('signalAxisX')}
        position="bottom"
        tickFormat={timeFormatter(niceTimeFormatByDay(1))}
      />

      <Axis id={getAxisId('signalAxisY')} position="left" />

      <HistogramBarSeries
        id={getSpecId('signalBar')}
        xScaleType="time"
        yScaleType="linear"
        xAccessor="x"
        yAccessors={['y']}
        splitSeriesAccessors={['a', 'b']}
        data={sampleChartData}
      />
    </Chart>
  );
});
HistogramSignals.displayName = 'HistogramSignals';
