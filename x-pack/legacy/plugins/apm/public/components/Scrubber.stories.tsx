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
  Theme,
  TooltipType
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

const theme: Partial<Theme> = {
  chartPaddings: { left: 0, top: 0, bottom: 0, right: 0 },
  chartMargins: { left: 0, top: 0, bottom: 0, right: 0 },
  scales: { barsPadding: 0 }
};

// TODO: Split colors based on service name
function barSeriesColorAccessor(series) {
  if (series.splitAccessors.get('service.name') === 'opbeans-java') {
    return 'rgb(96, 146, 192)';
  } else if (series.splitAccessors.get('service.name') === 'opbeans-python') {
    return 'rgb(84, 179, 153)';
  } else {
    return '#9170b8';
  }
}

function TimelineScrubber() {
  const [selection, setSelection] = React.useState<
    [number, number] | [undefined, undefined]
  >([undefined, undefined]);

  function onBrushEnd(y1, y2) {
    setSelection([y1, y2]);
  }

  return (
    <>
      <div
        style={{
          visibility: selection[0] ? 'visible' : 'hidden',
          fontSize: '11px',
          color: 'grey',
          textAlign: 'right',
          margin: '1em'
        }}
      >
        Selected {selection[0] && selection[0].toFixed(0)}
        &thinsp;&ndash;&thinsp;
        {selection[1] && selection[1].toFixed(0)} ms |{' '}
        <a
          href="#"
          onClick={event => {
            event.preventDefault();
            setSelection([undefined, undefined]);
          }}
        >
          Reset
        </a>
      </div>
      <div style={{ height: 90 }}>
        <Chart>
          <Settings
            onBrushEnd={onBrushEnd}
            rotation={90}
            theme={theme}
            tooltip={TooltipType.None}
          />
          <BarSeries
            id={getSpecId('lines')}
            customSeriesColors={barSeriesColorAccessor}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['max']}
            y0Accessors={['min']}
            //  splitSeriesAccessors={['service.name']}
            data={data}
          />
        </Chart>
      </div>
    </>
  );
}

storiesOf('TimelineScrubber', module).add(
  '¯\\_(ツ)_/¯',
  () => {
    return <TimelineScrubber />;
  },
  { info: { source: false, propTables: false }, showAddonPanel: false }
);
