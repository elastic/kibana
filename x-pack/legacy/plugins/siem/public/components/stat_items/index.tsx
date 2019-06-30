/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiHorizontalRule,
  EuiIcon,
  EuiTitle,
  IconType,
} from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

import { get, getOr } from 'lodash/fp';
import { ScaleType, niceTimeFormatter } from '@elastic/charts';
import { BarChart } from '../charts/barchart';
import { AreaChart } from '../charts/areachart';
import { getEmptyTagValue } from '../empty_value';
import { ChartConfigsData, ChartData, ChartSeriesConfigs } from '../charts/common';
import { KpiHostsData, KpiNetworkData, KpiIpDetailsData } from '../../graphql/types';
import { GlobalTime } from '../../containers/global_time';

const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
`;

const StatValue = styled(EuiTitle)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export interface StatItem<T> {
  key: string;
  barchartKey?: string;
  description?: string;
  value?: number | undefined | null;
  color?: string;
  icon?: IconType;
  name?: string;
  render?: (item: T) => void;
}

export interface StatItems<T> {
  key: string;
  fields: Array<StatItem<T>>;
  description?: string;
  enableAreaChart?: boolean;
  enableBarChart?: boolean;
  grow?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | true | false | null;
  areachartConfigs?: ChartSeriesConfigs;
  barchartConfigs?: ChartSeriesConfigs;
}

export interface StatItemsProps<T> extends StatItems<T> {
  areaChart?: ChartConfigsData[];
  barChart?: ChartConfigsData[];
}

export const numberFormatter = (value: string | number): string => value.toLocaleString();
export const areachartConfigs = (from: number, to: number) => ({
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
  },
  axis: {
    xTickFormatter: niceTimeFormatter([from, to]),
    yTickFormatter: numberFormatter,
  },
});
export const barchartConfigs = {
  series: {
    xScaleType: ScaleType.Ordinal,
    yScaleType: ScaleType.Linear,
  },
  axis: {
    xTickFormatter: numberFormatter,
  },
};
export type KpiValue = number | null | undefined;
export type StatItemData = KpiHostsData | KpiNetworkData | KpiIpDetailsData;

export const addValueToFields = (
  fields: Array<StatItem<KpiValue>>,
  data: StatItemData
): Array<StatItem<KpiValue>> => fields.map(field => ({ ...field, value: get(field.key, data) }));

export const addValueToAreaChart = (
  fields: Array<StatItem<KpiValue>>,
  data: StatItemData
): ChartConfigsData[] =>
  fields
    .filter(field => get(`${field.key}Histogram`, data) != null)
    .map(field => {
      const { render, ...areaChartFields } = field;
      return {
        ...areaChartFields,
        value: get(`${field.key}Histogram`, data),
        key: `${field.key}Histogram`,
      };
    });

export const addValueToBarChart = (
  fields: Array<StatItem<KpiValue>>,
  data: StatItemData
): ChartConfigsData[] => {
  if (fields.length === 0) return [];
  return fields.reduce((acc: ChartConfigsData[], field: StatItem<KpiValue>, idx: number) => {
    const { key, color } = field;
    const barchartKey = getOr(null, 'barchartKey', field);
    const y: number | null =
      barchartKey != null ? getOr(null, barchartKey, data) : getOr(null, key, data);
    const x: string = get(`${idx}.name`, fields) || getOr('', `${idx}.description`, fields);
    const value: [ChartData] = [
      {
        x,
        y,
        g: key,
      },
    ];

    return [
      ...acc,
      {
        key,
        color,
        value,
      },
    ];
  }, []);
};

export const useKpiMatrixStatus = (
  mappings: Readonly<Array<StatItemsProps<KpiValue>>>,
  data: StatItemData
): Readonly<Array<StatItemsProps<KpiValue>>> => {
  const [statItemsProps, setStatItemsProps] = useState(mappings);

  useEffect(
    () => {
      setStatItemsProps(
        mappings.map(stat => {
          return {
            ...stat,
            key: `kpi-summary-${stat.key}`,
            fields: addValueToFields(stat.fields, data),
            areaChart: stat.enableAreaChart ? addValueToAreaChart(stat.fields, data) : undefined,
            barChart: stat.enableBarChart ? addValueToBarChart(stat.fields, data) : undefined,
          };
        })
      );
    },
    [data]
  );

  return statItemsProps;
};

export const StatItemsComponent = React.memo<StatItemsProps<KpiValue>>(
  ({ fields, description, grow, barChart, areaChart, enableAreaChart, enableBarChart }) => {
    const isBarChartDataAvailable =
      barChart &&
      barChart.length &&
      barChart.every(item => item.value != null && item.value.length > 0);
    const isAreaChartDataAvailable =
      areaChart &&
      areaChart.length &&
      areaChart.every(item => item.value != null && item.value.length > 0);

    return (
      <FlexItem grow={grow}>
        <EuiPanel>
          <EuiTitle size="xxxs">
            <h6>{description}</h6>
          </EuiTitle>

          <EuiFlexGroup>
            {fields &&
              fields.map(field => (
                <FlexItem key={`stat-items-field-${field.key}`}>
                  <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                    {(isAreaChartDataAvailable || isBarChartDataAvailable) && field.icon && (
                      <FlexItem grow={false}>
                        <EuiIcon
                          type={field.icon}
                          color={field.color}
                          size="l"
                          data-test-subj="stat-icon"
                        />
                      </FlexItem>
                    )}

                    <FlexItem>
                      <StatValue>
                        <p data-test-subj="stat-title">
                          {field.render && field.value != null
                            ? field.render(field.value)
                            : !field.render && field.value != null
                            ? field.value
                            : getEmptyTagValue()}{' '}
                          {field.description}
                        </p>
                      </StatValue>
                    </FlexItem>
                  </EuiFlexGroup>
                </FlexItem>
              ))}
          </EuiFlexGroup>

          {(enableAreaChart || enableBarChart) && <EuiHorizontalRule />}

          <EuiFlexGroup>
            {enableBarChart && (
              <FlexItem>
                <BarChart barChart={barChart} configs={barchartConfigs} />
              </FlexItem>
            )}

            {enableAreaChart && (
              <FlexItem>
                <GlobalTime>
                  {({ from, to }) => (
                    <AreaChart areaChart={areaChart} configs={areachartConfigs(from, to)} />
                  )}
                </GlobalTime>
              </FlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      </FlexItem>
    );
  }
);
