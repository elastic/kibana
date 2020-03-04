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
  Theme
} from '@elastic/charts';
import { IWaterfall } from '../Waterfall/waterfall_helpers/waterfall_helpers';
import { SelectionText } from './SelectionText';
import { SelectionAnnotation } from './SelectionAnnotation';
import { WaterfallSelection } from '..';

const chartTheme: Partial<Theme> = {
  chartPaddings: { left: 0, top: 0, bottom: 0, right: 0 },
  chartMargins: { left: 0, top: 0, bottom: 0, right: 0 },
  scales: { barsPadding: 0, histogramPadding: 0 }
};

interface Props {
  onBrushEnd: BrushEndListener;
  resetSelection: () => void;
  selection: WaterfallSelection;
  waterfall: IWaterfall;
}

export function MiniWaterfall({
  onBrushEnd,
  resetSelection,
  selection,
  waterfall
}: Props) {
  const data = waterfall.items.map((item, index) => ({
    ...item,
    min: item.offset + item.skew,
    max: item.offset + item.duration,
    x: index
  }));
  const maxY = Math.max(...data.map(item => item.max));
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
