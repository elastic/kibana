/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  BrushEndListener,
  Chart,
  Settings,
  TooltipType,
  BarSeries,
  getSpecId,
  ScaleType,
  RectAnnotation,
  Theme
} from '@elastic/charts';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { IWaterfall } from '../Waterfall/waterfall_helpers/waterfall_helpers';

type Selection = [number, number] | [undefined, undefined];

interface SelectionTextProps {
  selection: Selection;
  resetSelection: () => void;
}

function SelectionAnnotation({
  maxY,
  selection,
  waterfall
}: {
  maxY: number;
  selection: Selection;
  waterfall: IWaterfall;
}) {
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

const chartTheme: Partial<Theme> = {
  chartPaddings: { left: 0, top: 0, bottom: 0, right: 0 },
  chartMargins: { left: 0, top: 0, bottom: 0, right: 0 },
  scales: { barsPadding: 0, histogramPadding: 0 }
};

interface Props {
  waterfall: IWaterfall;
}

export function MiniWaterfall({ waterfall }: Props) {
  const [selection, setSelection] = React.useState<Selection>([
    undefined,
    undefined
  ]);

  const data = waterfall.items.map((item, index) => ({
    ...item,
    min: item.offset + item.skew,
    max: item.offset + item.duration,
    x: index
  }));
  const maxY = Math.max(...data.map(item => item.max));

  const onBrushEnd: BrushEndListener = (y1, y2) => {
    setSelection([y1, y2]);
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
            onBrushEnd={onBrushEnd}
            rotation={90}
            theme={chartTheme}
            tooltip={TooltipType.None}
          />
          <SelectionAnnotation
            maxY={maxY}
            selection={selection}
            waterfall={waterfall}
          />
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
