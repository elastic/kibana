/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, SetStateAction } from 'react';
import {
  BrushEndListener,
  Chart,
  Settings,
  TooltipType,
  BarSeries,
  getSpecId,
  ScaleType,
  Theme
} from '@elastic/charts';
import {
  IWaterfall,
  IWaterfallItem
} from '../Waterfall/waterfall_helpers/waterfall_helpers';
import { SelectionText } from './SelectionText';
import { SelectionAnnotation } from './SelectionAnnotation';
import { WaterfallSelection } from '..';

const chartTheme: Partial<Theme> = {
  chartPaddings: { left: 0, top: 0, bottom: 0, right: 0 },
  chartMargins: { left: 0, top: 0, bottom: 0, right: 0 },
  scales: { barsPadding: 0, histogramPadding: 0 }
};

interface Props {
  selection: WaterfallSelection;
  setSelection: Dispatch<SetStateAction<WaterfallSelection>>;
  waterfall: IWaterfall;
}

// We want to have at least this many items to make it look "mini"
const minItems = 10;

export function MiniWaterfall({ selection, setSelection, waterfall }: Props) {
  function resetSelection() {
    setSelection([undefined, undefined]);
  }

  const onBrushEnd: BrushEndListener = (y1, y2) => {
    // FIXME: Since brushing is broken, just pick some random numbers
    const maxY = Math.max(
      ...waterfall.items.map(item => item.offset + item.duration)
    );
    const start = Math.floor(Math.random() * maxY);
    const end = Math.floor(Math.random() * (maxY - start)) + start;
    console.log({ start, end, maxY });
    // setSelection([y1, y2]);
    setSelection([start, end]);
  };

  const data: Array<Partial<IWaterfallItem> & {
    min: number;
    max: number;
    x: number;
  }> = waterfall.items.map((item, index) => ({
    ...item,
    min: item.offset + item.skew,
    max: item.offset + item.duration,
    x: index
  }));

  const maxY = Math.max(...data.map(item => item.max));

  for (let i = 0; i < minItems - waterfall.items.length; i++) {
    data.push({
      min: 0,
      max: 0,
      x: waterfall.items.length + i
    });
  }

  console.log({ data });
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
            xLength={Math.max(waterfall.items.length, minItems)}
          />
          <BarSeries
            id={getSpecId('lines')}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['max']}
            y0Accessors={['min']}
            styleAccessor={value => {
              return waterfall.serviceColors[value.datum.doc?.service?.name];
            }}
            data={data}
          />
        </Chart>
      </div>
    </>
  );
}
