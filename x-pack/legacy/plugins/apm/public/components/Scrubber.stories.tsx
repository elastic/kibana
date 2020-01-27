/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BarSeries,
  Chart,
  getSpecId,
  ScaleType,
  SeriesIdentifier,
  Settings,
  Theme
} from '@elastic/charts';
import '@elastic/charts/dist/theme_light.css';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { getWaterfall } from './app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import response from './scrubber.data.json';

// The contents of scrubber.data.json is was directly copied from a trace API
// response, originally http://localhost:5601/kbn/api/apm/traces/21bd90461ba6355df98352070360f5f7.
// You can paste the contents of any trace to see the response.
const entryTransactionId = '6528d29667c22f62';
const waterfall = getWaterfall(response, entryTransactionId);

const data = waterfall.items.map((item, index) => ({
  min: item.offset,
  max: item.offset + item.duration,
  'service.name': item.doc.service.name,
  x: index
}));

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
  } else if (series.splitAccessors.get('service.name') === 'opbeans-python') {
    return 'rgb(84, 179, 153)';
  } else {
    return '#9170b8';
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
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['max']}
            y0Accessors={['min']}
            splitSeriesAccessors={['service.name']}
            data={data}
          />
        </Chart>
      </div>
    );
  },
  { info: { source: false, propTables: false }, showAddonPanel: false }
);
