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
import { getChartDateLabel, seriesHasDownValues } from '../../../lib/helper';
import { useUrlParams } from '../../../hooks';

export interface MonitorBarSeriesProps {
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
export const MonitorBarSeries = ({ dangerColor, histogramSeries }: MonitorBarSeriesProps) => {
  const [getUrlParams] = useUrlParams();
  const { absoluteDateRangeStart, absoluteDateRangeEnd } = getUrlParams();

  const id = 'downSeries';

  return seriesHasDownValues(histogramSeries) ? (
    <div style={{ height: 50, width: '100%', maxWidth: '1200px', marginRight: 15 }}>
      <Chart>
        <Settings xDomain={{ min: absoluteDateRangeStart, max: absoluteDateRangeEnd }} />
        <Axis
          hide
          id="bottom"
          position={Position.Bottom}
          tickFormat={timeFormatter(
            getChartDateLabel(absoluteDateRangeStart, absoluteDateRangeEnd)
          )}
        />
        <BarSeries
          id={id}
          customSeriesColors={[dangerColor]}
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
