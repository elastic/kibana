/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { get } from 'lodash';
import { Axis, Chart, getAxisId, niceTimeFormatter, Position, Settings } from '@elastic/charts';
import { EuiPageContentBody, EuiTitle } from '@elastic/eui';
import { InfraMetricLayoutSection } from '../../../pages/metrics/layouts/types';
import { InfraMetricData, InfraTimerangeInput } from '../../../graphql/types';
import { getChartTheme } from '../../metrics_explorer/helpers/get_chart_theme';
import { InfraFormatterType } from '../../../lib/lib';
import { SeriesChart } from './series_chart';
import {
  getFormatter,
  getMaxMinTimestamp,
  getChartName,
  getChartColor,
  getChartType,
} from './helpers';

interface Props {
  section: InfraMetricLayoutSection;
  metric: InfraMetricData;
  onChangeRangeTime?: (time: InfraTimerangeInput) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
  intl: InjectedIntl;
}

export const ChartSectionNew = injectI18n(
  ({ onChangeRangeTime, section, metric, intl, stopLiveStreaming, isLiveStreaming }: Props) => {
    const { visConfig } = section;
    const formatter = get(visConfig, 'formatter', InfraFormatterType.number);
    const formatterTemplate = get(visConfig, 'formatterTemplate', '{{value}}');
    const valueFormatter = useCallback(getFormatter(formatter, formatterTemplate), [
      formatter,
      formatterTemplate,
    ]);
    const dateFormatter = useCallback(niceTimeFormatter(getMaxMinTimestamp(metric)), [metric]);
    const handleTimeChange = useCallback(
      (from: number, to: number) => {
        if (onChangeRangeTime) {
          if (isLiveStreaming && stopLiveStreaming) {
            stopLiveStreaming();
          }
          onChangeRangeTime({
            from,
            to,
            interval: '>=1m',
          });
        }
      },
      [onChangeRangeTime, isLiveStreaming, stopLiveStreaming]
    );

    return (
      <EuiPageContentBody>
        <EuiTitle size="xs">
          <h3 id={section.id}>{section.label}</h3>
        </EuiTitle>
        <div style={{ height: 200 }}>
          <Chart>
            <Axis
              id={getAxisId('timestamp')}
              position={Position.Bottom}
              showOverlappingTicks={true}
              tickFormat={dateFormatter}
            />
            <Axis id={getAxisId('values')} position={Position.Left} tickFormat={valueFormatter} />
            {metric &&
              metric.series.map(series => (
                <SeriesChart
                  key={`series-${section.id}-${series.id}`}
                  id={`series-${section.id}-${series.id}`}
                  series={series}
                  name={getChartName(section, series.id)}
                  type={getChartType(section, series.id)}
                  color={getChartColor(section, series.id)}
                  stack={visConfig.stacked}
                />
              ))}
            <Settings onBrushEnd={handleTimeChange} theme={getChartTheme()} />
          </Chart>
        </div>
      </EuiPageContentBody>
    );
  }
);
