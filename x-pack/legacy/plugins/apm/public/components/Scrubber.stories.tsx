/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BarSeries,
  BrushEndListener,
  Chart,
  getSpecId,
  RectAnnotation,
  ScaleType,
  Settings,
  Theme,
  TooltipType
} from '@elastic/charts';
import '@elastic/charts/dist/theme_light.css';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { getWaterfall } from './app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';
import response from './scrubber.data.json';

// The contents of scrubber.data.json is was directly copied from a trace API
// response, originally http://localhost:5601/kbn/api/apm/traces/21bd90461ba6355df98352070360f5f7?start=2020-01-23T17%3A33%3A56.839Z&end=2020-02-24T17%3A33%3A56.840Z
// You can paste the contents of any trace to see the response.
const entryTransactionId = '6528d29667c22f62';
const waterfall = getWaterfall(response, entryTransactionId);

const data = waterfall.items.map((item, index) => ({
  ...item,
  min: item.offset + item.skew,
  max: item.offset + item.duration,
  x: index
}));
console.log({ data });
const chartTheme: Partial<Theme> = {
  chartPaddings: { left: 0, top: 0, bottom: 0, right: 0 },
  chartMargins: { left: 0, top: 0, bottom: 0, right: 0 },
  scales: { barsPadding: 0, histogramPadding: 0 }
};
const maxY = Math.max(...data.map(item => item.max));

function SelectionAnnotation({ selection }: { selection: Selection }) {
  const x0 = 0;
  const x1 = selection[0] ? waterfall.items.length - 1 : 0;
  const y1left = (selection[0] ?? 0) * 100;
  const y0right = (selection[1] ?? 0) * 100;

  return (
    <RectAnnotation
      dataValues={[
        {
          coordinates: {
            x0,
            x1,
            y0: 0,
            y1: y1left
          }
        },
        {
          coordinates: {
            x0,
            x1,
            y0: y0right,
            y1: maxY
          }
        }
      ]}
      id="selection"
      style={{
        strokeWidth: parseInt(theme.euiBorderWidthThin, 10),
        stroke: theme.euiBorderColor,
        // fill: theme.euiColorLightestShade,
        fill: 'green',
        opacity: 0.5
      }}
      zIndex={1}
    />
  );
}

type Selection = [number, number] | [undefined, undefined];

interface SelectionTextProps {
  selection: Selection;
  resetSelection: () => void;
}

function SelectionText({ selection, resetSelection }: SelectionTextProps) {
  return (
    <div
      style={{
        visibility: selection[0] ? 'visible' : 'hidden',
        fontSize: '11px',
        color: 'grey',
        textAlign: 'right',
        marginBottom: 16
      }}
    >
      Selected {selection[0] && (selection[0] / 100).toFixed(0)}
      &thinsp;&ndash;&thinsp;
      {selection[1] && (selection[1] / 100).toFixed(0)} ms |{' '}
      <button onClick={resetSelection} style={{ color: 'blue' }}>
        Reset
      </button>
    </div>
  );
}

function TimelineScrubber() {
  const [selection, setSelection] = React.useState<Selection>([
    undefined,
    undefined
  ]);

  const onBrushEnd: BrushEndListener = (y1, y2) => {
    setSelection([y1, y2]);
    console.log(y1, y2);
  };

  function resetSelection() {
    setSelection([undefined, undefined]);
  }

  return (
    <>
      <SelectionText selection={selection} resetSelection={resetSelection} />
      <div style={{ height: 60 }}>
        <Chart>
          <Settings
            debug={true}
            onBrushEnd={onBrushEnd}
            rotation={90}
            theme={chartTheme}
            tooltip={TooltipType.None}
          />
          <SelectionAnnotation selection={selection} />
          <BarSeries
            id={getSpecId('lines')}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['max']}
            y0Accessors={['min']}
            styleAccessor={value => {
              return waterfall.serviceColors[value.datum.doc.service.name];
            }}
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
    return (
      <div style={{ maxWidth: 1330, padding: 16, border: '1px solid grey' }}>
        <TimelineScrubber />
      </div>
    );
  },
  { info: { source: false, propTables: false }, showAddonPanel: false }
);
