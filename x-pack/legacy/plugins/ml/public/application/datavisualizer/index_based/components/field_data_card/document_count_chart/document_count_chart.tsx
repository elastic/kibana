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
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';

import { useUiChromeContext } from '../../../../../contexts/ui/use_ui_chrome_context';

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

  const IS_DARK_THEME = useUiChromeContext()
    .getUiSettingsClient()
    .get('theme:darkMode');
  const themeName = IS_DARK_THEME ? darkTheme : lightTheme;
  const EVENT_RATE_COLOR = themeName.euiColorVis2;

  return (
    <div style={{ width, height }}>
      <Chart>
        <Settings
          xDomain={xDomain}
          theme={{
            colors: {
              vizColors: [EVENT_RATE_COLOR],
            },
          }}
        />
        <Axis
          id="bottom"
          position={Position.Bottom}
          showOverlappingTicks={true}
          tickFormat={dateFormatter}
        />
        <Axis id="left" position={Position.Left} />
        <BarSeries
          id={SPEC_ID}
          name={seriesName}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="time"
          yAccessors={['value']}
          // Display empty chart when no data in range
          data={chartPoints.length > 0 ? chartPoints : [{ time: timeRangeEarliest, value: 0 }]}
        />
      </Chart>
    </div>
  );
};
