/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  Position,
  Settings,
  ScaleType,
  timeFormatter,
} from '@elastic/charts';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { StatusData } from '../../../../common/graphql/types';
import { getChartDateLabel } from '../../../lib/helper';
import { getColorsMap } from './get_colors_map';
import { useUrlParams } from '../../../hooks';

interface ChecksChartProps {
  /**
   * The color that will be used for the area series displaying "Down" checks.
   */
  dangerColor: string;
  /**
   * The timeseries data displayed in the chart.
   */
  status: StatusData[];
  /**
   * The color that will be used for the area series displaying "Up" checks.
   */
  successColor: string;
}

/**
 * Renders a chart that displays the total count of up/down status checks over time
 * as a stacked area chart.
 * @param props The props values required by this component.
 */
export const ChecksChart = ({ dangerColor, status, successColor }: ChecksChartProps) => {
  const upSeriesSpecId = 'Up';
  const downSeriesSpecId = 'Down';
  const [getUrlParams] = useUrlParams();
  const { absoluteDateRangeStart: min, absoluteDateRangeEnd: max } = getUrlParams();

  const upString = i18n.translate('xpack.uptime.monitorCharts.checkStatus.series.upCountLabel', {
    defaultMessage: 'Up count',
  });
  const downString = i18n.translate(
    'xpack.uptime.monitorCharts.checkStatus.series.downCountLabel',
    {
      defaultMessage: 'Down count',
    }
  );

  return (
    <React.Fragment>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.uptime.monitorCharts.checkStatus.title"
            defaultMessage="Check status"
          />
        </h4>
      </EuiTitle>
      <EuiPanel>
        <Chart>
          <Settings xDomain={{ min, max }} showLegend={false} />
          <Axis
            id="checksBottom"
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={timeFormatter(getChartDateLabel(min, max))}
            title={i18n.translate('xpack.uptime.monitorChart.checksChart.bottomAxis.title', {
              defaultMessage: 'Timestamp',
              description: 'The heading of the x-axis of a chart of timeseries data.',
            })}
          />
          <Axis
            id="left"
            position={Position.Left}
            tickFormat={d => Number(d).toFixed(0)}
            title={i18n.translate('xpack.uptime.monitorChart.checksChart.leftAxis.title', {
              defaultMessage: 'Number of checks',
              description: 'The heading of the y-axis of a chart of timeseries data',
            })}
          />
          <AreaSeries
            customSeriesColors={getColorsMap(successColor, upSeriesSpecId)}
            data={status.map(({ x, up }) => ({
              x,
              [upString]: up || 0,
            }))}
            id={upSeriesSpecId}
            stackAccessors={['x']}
            timeZone="local"
            xAccessor="x"
            xScaleType={ScaleType.Time}
            yAccessors={[upString]}
            yScaleType={ScaleType.Linear}
          />
          <AreaSeries
            customSeriesColors={getColorsMap(dangerColor, downSeriesSpecId)}
            data={status.map(({ x, down }) => ({
              x,
              [downString]: down || 0,
            }))}
            id={downSeriesSpecId}
            stackAccessors={['x']}
            timeZone="local"
            xAccessor="x"
            xScaleType={ScaleType.Time}
            yAccessors={[downString]}
            yScaleType={ScaleType.Linear}
          />
        </Chart>
      </EuiPanel>
    </React.Fragment>
  );
};
