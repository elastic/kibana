/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  Axis,
  BarSeries,
  Chart,
  DataSeriesColorsValues,
  getAxisId,
  getSpecId,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';

import chrome from 'ui/chrome';
import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';

export interface DocumentCountChartPoint {
  time: number | string;
  value: number;
}

interface Props {
  width: number;
  height: number;
  chartPoints: DocumentCountChartPoint[];
  timeRangeEarliest: number;
  timeRangeLatest: number;
}

const SPEC_ID = 'document_count';

// TODO - switch to use inline areaSeriesStyle to set series fill once charts version is 8.0.0+
const IS_DARK_THEME = chrome.getUiSettingsClient().get('theme:darkMode');
const themeName = IS_DARK_THEME ? darkTheme : lightTheme;
const EVENT_RATE_COLOR = themeName.euiColorVis2;
const barSeriesColorValues: DataSeriesColorsValues = {
  colorValues: [],
  specId: getSpecId(SPEC_ID),
};
const seriesColors = new Map([[barSeriesColorValues, EVENT_RATE_COLOR]]);

export const DocumentCountChart: FC<Props> = ({
  width,
  height,
  chartPoints,
  timeRangeEarliest,
  timeRangeLatest,
}) => {
  const seriesName = i18n.translate('xpack.ml.fieldDataCard.documentCountChart.seriesLabel', {
    defaultMessage: 'document count',
  });

  const xDomain = {
    min: timeRangeEarliest,
    max: timeRangeLatest,
  };

  const dateFormatter = niceTimeFormatter([timeRangeEarliest, timeRangeLatest]);

  return (
    <div style={{ width, height }}>
      <Chart>
        <Settings xDomain={xDomain} />
        <Axis
          id={getAxisId('bottom')}
          position={Position.Bottom}
          showOverlappingTicks={true}
          tickFormat={dateFormatter}
        />
        <Axis id={getAxisId('left')} position={Position.Left} />
        <BarSeries
          id={getSpecId(SPEC_ID)}
          name={seriesName}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="time"
          yAccessors={['value']}
          // Display empty chart when no data in range
          data={chartPoints.length > 0 ? chartPoints : [{ time: timeRangeEarliest, value: 0 }]}
          customSeriesColors={seriesColors}
        />
      </Chart>
    </div>
  );
};
