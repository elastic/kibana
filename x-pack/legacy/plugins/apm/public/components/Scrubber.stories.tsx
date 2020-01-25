/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '@elastic/charts/dist/theme_light.css';
import { storiesOf } from '@storybook/react';
import React from 'react';
import {
  Chart,
  Settings,
  Axis,
  getAxisId,
  BarSeries,
  getSpecId,
  ScaleType,
  Position,
  Theme,
  SeriesIdentifier
} from '@elastic/charts';
import data from './scrubber.data.json';

console.log(data.items);

function onBrushEnd() {
  console.log('onBrushEnd');
}

const theme: Partial<Theme> = {
  chartPaddings: { left: 0, top: 0, bottom: 0, right: 0 },
  chartMargins: { left: 0, top: 0, bottom: 0, right: 0 },
  scales: { barsPadding: 0 }
};

function barSeriesColorAccessor(series: SeriesIdentifier) {
  if (series.splitAccessors.get('service.name') === 'opbeans-java') {
    return 'rgb(96, 146, 192)';
  } else {
    return 'rgb(84, 179, 153)';
  }
}

storiesOf('TimelineScrubber', module).add(
  '¯\\_(ツ)_/¯',
  () => {
    return (
      <div style={{ height: 60 }}>
        <Chart>
          <Settings onBrushEnd={onBrushEnd} rotation={90} theme={theme} />
          <BarSeries
            id={getSpecId('lines')}
            customSeriesColors={barSeriesColorAccessor}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Time}
            xAccessor="x"
            yAccessors={['max']}
            y0Accessors={['min']}
            splitSeriesAccessors={['service.name']}
            data={[
              { x: 1, min: 2, max: 12 },
              { x: 2, min: 2, max: 8, 'service.name': 'opbeans-java' },
              { x: 3, min: 2, max: 5 }
            ]}
          />
        </Chart>
      </div>
    );
  },
  { info: { source: false, propTables: false }, showAddonPanel: false }
);
