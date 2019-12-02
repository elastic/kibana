/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  Chart,
  ScaleType,
  Settings,
  Position,
  timeFormatter,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiToolTip } from '@elastic/eui';
import { SummaryHistogramPoint } from '../../../../common/graphql/types';
import { getColorsMap } from './get_colors_map';
import { getChartDateLabel, seriesHasDownValues } from '../../../lib/helper';

export interface MonitorBarSeriesProps {
  /**
   * The date/time for the start of the timespan.
   */
  absoluteStartDate: number;
  /**
   * The date/time for the end of the timespan.
   */
  absoluteEndDate: number;
  /**
   * The color to use for the display of down states.
   */
  dangerColor: string;
  /**
   * The timeseries data to display.
   */
  histogramSeries: SummaryHistogramPoint[] | null;
}

/**
 * There is a specific focus on the monitor's down count, the up series is not shown,
 * so we will only render the series component if there are down counts for the selected monitor.
 * @param props - the values for the monitor this chart visualizes
 */
export const MonitorBarSeries = ({
  absoluteStartDate,
  absoluteEndDate,
  dangerColor,
  histogramSeries,
}: MonitorBarSeriesProps) => {
  const id = 'downSeries';

  return seriesHasDownValues(histogramSeries) ? (
    <div style={{ height: 50, width: '100%', maxWidth: '1200px' }}>
      <Chart>
        <Settings xDomain={{ min: absoluteStartDate, max: absoluteEndDate }} />
        <Axis
          hide
          id="bottom"
          position={Position.Bottom}
          tickFormat={timeFormatter(getChartDateLabel(absoluteStartDate, absoluteEndDate))}
        />
        <BarSeries
          id={id}
          customSeriesColors={getColorsMap(dangerColor, id)}
          data={(histogramSeries || []).map(({ timestamp, down }) => [timestamp, down])}
          name={i18n.translate('xpack.uptime.monitorList.downLineSeries.downLabel', {
            defaultMessage: 'Down checks',
          })}
          timeZone="local"
          xAccessor={0}
          xScaleType={ScaleType.Time}
          yAccessors={[1]}
          yScaleType={ScaleType.Linear}
        />
      </Chart>
    </div>
  ) : (
    <EuiToolTip
      position="top"
      content={
        <FormattedMessage
          id="xpack.uptime.monitorList.noDownHistory"
          defaultMessage="This monitor has never been {emphasizedText} during the selected time range."
          values={{ emphasizedText: <strong>down</strong> }}
        />
      }
    >
      <EuiText color="secondary">--</EuiText>
    </EuiToolTip>
  );
};
