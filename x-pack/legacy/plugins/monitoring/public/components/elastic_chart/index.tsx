/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import {
  Axis,
  Chart,
  getAxisId,
  getSpecId,
  LineSeries,
  Settings,
  ScaleType,
  Theme,
  LIGHT_THEME,
  DARK_THEME,
} from '@elastic/charts';
import {
  EuiPageContent,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiScreenReaderOnly,
  EuiIconTip,
} from '@elastic/eui';
import { get } from 'lodash';
import { getTitle, getUnits, formatTicksValues, formatTimeValues } from './helpers/utils';
import { InfoTooltip } from './helpers/info_tooltip';
import { Series } from './helpers/types';

interface PropsSeries {
  series: Series[];
}
type OptionalComponent = JSX.Element | null;
type StaticComponent = JSX.Element;

const getBaseTheme = (): Theme => {
  const modeTheme: Theme = chrome.getUiSettingsClient().get('theme:darkMode')
    ? DARK_THEME
    : LIGHT_THEME;
  return {
    ...modeTheme,
    lineSeriesStyle: {
      line: {
        strokeWidth: 2,
        visible: true,
        opacity: 1,
      },
      point: {
        strokeWidth: 1,
        visible: true,
        radius: 2,
        opacity: 1,
      },
    },
  };
};

const gridLines = {
  showGridLines: true,
  gridLineStyle: {
    stroke: 'black',
    strokeWidth: 0.5,
    opacity: 0.1,
  },
};

const MonitoringChart = ({ series }: PropsSeries): OptionalComponent => {
  if (!series) {
    return null;
  }

  const firstSeries: Series = series[0];
  const { timeRange } = firstSeries;
  const { min, max } = timeRange;
  return (
    <Chart>
      <Settings showLegend legendPosition="bottom" xDomain={{ min, max }} theme={getBaseTheme()} />
      <Axis
        id={getAxisId('bottom')}
        position="bottom"
        {...gridLines}
        tickFormat={formatTimeValues}
      />
      <Axis id={getAxisId('left')} {...gridLines} tickFormat={formatTicksValues(firstSeries)} />
      {series.map((item: any, index: number) => (
        <LineSeries
          key={index}
          id={getSpecId(item.metric.label)}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[1]}
          data={item.data}
          yScaleToDataExtent={true}
          curve={9}
        />
      ))}
    </Chart>
  );
};

export const MonitoringTimeseriesContainer = ({ series }: PropsSeries): OptionalComponent => {
  if (!series) {
    return null;
  }

  const seriesTitle: string = getTitle(series);
  const titleForAriaIds: string = seriesTitle.replace(/\s+/, '--');
  const units: string = getUnits(series[0]);
  const title: string = `${seriesTitle}${units ? ` (${units})` : ''}`;
  const bucketSize: string = get(series[0], 'bucket_size');
  const seriesScreenReaderTextList: string[] = [
    i18n.translate('xpack.monitoring.chart.seriesScreenReaderListDescription', {
      defaultMessage: 'Interval: {bucketSize}',
      values: {
        bucketSize,
      },
    }),
  ].concat(series.map((item: any) => `${item.metric.label}: ${item.metric.description}`));

  return (
    <EuiFlexGroup direction="column" gutterSize="s" className="monRhythmChart__wrapper">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <>
                {title}
                <EuiScreenReaderOnly>
                  <span>
                    <FormattedMessage
                      id="xpack.monitoring.chart.screenReaderUnaccessibleTitle"
                      defaultMessage="This chart is not screen reader accessible"
                    />
                  </span>
                </EuiScreenReaderOnly>
              </>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              anchorClassName="eui-textRight eui-alignMiddle monChart__tooltipTrigger"
              type="iInCircle"
              position="right"
              content={<InfoTooltip series={series} bucketSize={bucketSize} />}
            />
            <EuiScreenReaderOnly>
              <span id={`monitoringChart${titleForAriaIds}`}>
                {seriesScreenReaderTextList.join('. ')}
              </span>
            </EuiScreenReaderOnly>
          </EuiFlexItem>
          {/* zoom button was here */}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem style={{ height: '250px' }}>
        <MonitoringChart {...{ series }} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const MonitoringCharts = ({ metrics }: { metrics: Series[][] }): StaticComponent => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiPageContent>
        <EuiFlexGrid columns={2} gutterSize="s">
          {metrics.map((series: Series[], index: number) => (
            <EuiFlexItem key={index}>
              <MonitoringTimeseriesContainer {...{ series }} />
              <EuiSpacer size="xs" />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiPageContent>
    </>
  );
};
