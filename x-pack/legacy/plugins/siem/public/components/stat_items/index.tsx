/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ScaleType,
  niceTimeFormatter,
  Rotation,
  BrushEndListener,
  ElementClickListener,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiHorizontalRule,
  EuiIcon,
  EuiTitle,
  IconType,
} from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

import { KpiHostsData, KpiNetworkData } from '../../graphql/types';
import { AreaChart } from '../charts/areachart';
import { BarChart } from '../charts/barchart';
import { ChartSeriesData, ChartData, ChartSeriesConfigs, UpdateDateRange } from '../charts/common';
import { getEmptyTagValue } from '../empty_value';

import { InspectButton } from '../inspect';

const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
`;

FlexItem.displayName = 'FlexItem';

const StatValue = styled(EuiTitle)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

StatValue.displayName = 'StatValue';

interface StatItem {
  color?: string;
  description?: string;
  icon?: IconType;
  key: string;
  name?: string;
  value: number | undefined | null;
}

export interface StatItems {
  areachartConfigs?: ChartSeriesConfigs;
  barchartConfigs?: ChartSeriesConfigs;
  description?: string;
  enableAreaChart?: boolean;
  enableBarChart?: boolean;
  fields: StatItem[];
  grow?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | true | false | null;
  index: number;
  key: string;
  statKey?: string;
}

export interface StatItemsProps extends StatItems {
  areaChart?: ChartSeriesData[];
  barChart?: ChartSeriesData[];
  from: number;
  id: string;
  narrowDateRange: UpdateDateRange;
  to: number;
}

export const numberFormatter = (value: string | number): string => value.toLocaleString();
const statItemBarchartRotation: Rotation = 90;
const statItemChartCustomHeight = 74;

export const areachartConfigs = (config?: {
  xTickFormatter: (value: number) => string;
  onBrushEnd?: BrushEndListener;
}) => ({
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
  },
  axis: {
    xTickFormatter: get('xTickFormatter', config),
    yTickFormatter: numberFormatter,
  },
  settings: {
    onBrushEnd: getOr(() => {}, 'onBrushEnd', config),
  },
  customHeight: statItemChartCustomHeight,
});

export const barchartConfigs = (config?: { onElementClick?: ElementClickListener }) => ({
  series: {
    xScaleType: ScaleType.Ordinal,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['y0'],
  },
  axis: {
    xTickFormatter: numberFormatter,
  },
  settings: {
    onElementClick: getOr(() => {}, 'onElementClick', config),
    rotation: statItemBarchartRotation,
  },
  customHeight: statItemChartCustomHeight,
});

export const addValueToFields = (
  fields: StatItem[],
  data: KpiHostsData | KpiNetworkData
): StatItem[] => fields.map(field => ({ ...field, value: get(field.key, data) }));

export const addValueToAreaChart = (
  fields: StatItem[],
  data: KpiHostsData | KpiNetworkData
): ChartSeriesData[] =>
  fields
    .filter(field => get(`${field.key}Histogram`, data) != null)
    .map(field => ({
      ...field,
      value: get(`${field.key}Histogram`, data),
      key: `${field.key}Histogram`,
    }));

export const addValueToBarChart = (
  fields: StatItem[],
  data: KpiHostsData | KpiNetworkData
): ChartSeriesData[] => {
  if (fields.length === 0) return [];
  return fields.reduce((acc: ChartSeriesData[], field: StatItem, idx: number) => {
    const { key, color } = field;
    const y: number | null = getOr(null, key, data);
    const x: string = get(`${idx}.name`, fields) || getOr('', `${idx}.description`, fields);
    const value: [ChartData] = [
      {
        x,
        y,
        g: key,
        y0: 0,
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
  mappings: Readonly<StatItems[]>,
  data: KpiHostsData | KpiNetworkData,
  id: string,
  from: number,
  to: number,
  narrowDateRange: UpdateDateRange
): StatItemsProps[] => {
  const [statItemsProps, setStatItemsProps] = useState(mappings as StatItemsProps[]);

  useEffect(() => {
    setStatItemsProps(
      mappings.map(stat => {
        return {
          ...stat,
          areaChart: stat.enableAreaChart ? addValueToAreaChart(stat.fields, data) : undefined,
          barChart: stat.enableBarChart ? addValueToBarChart(stat.fields, data) : undefined,
          fields: addValueToFields(stat.fields, data),
          id,
          key: `kpi-summary-${stat.key}`,
          statKey: `${stat.key}`,
          from,
          to,
          narrowDateRange,
        };
      })
    );
  }, [data]);

  return statItemsProps;
};

export const StatItemsComponent = React.memo<StatItemsProps>(
  ({
    areaChart,
    barChart,
    description,
    enableAreaChart,
    enableBarChart,
    fields,
    from,
    grow,
    id,
    index,
    narrowDateRange,
    statKey = 'item',
    to,
  }) => {
    const [isHover, setIsHover] = useState(false);
    const handleMouseEnter = useCallback(() => setIsHover(true), [setIsHover]);
    const handleMouseLeave = useCallback(() => setIsHover(false), [setIsHover]);
    const isBarChartDataAvailable =
      barChart &&
      barChart.length &&
      barChart.every(item => item.value != null && item.value.length > 0);
    const isAreaChartDataAvailable =
      areaChart &&
      areaChart.length &&
      areaChart.every(item => item.value != null && item.value.length > 0);

    return (
      <FlexItem data-test-subj={`stat-${statKey}`} grow={grow}>
        <EuiPanel onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <EuiFlexGroup gutterSize={'none'}>
            <EuiFlexItem>
              <EuiTitle size="xxxs">
                <h6>{description}</h6>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <InspectButton
                inspectIndex={index}
                queryId={id}
                show={isHover}
                title={`KPI ${description}`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexGroup>
            {fields.map(field => (
              <FlexItem key={`stat-items-field-${field.key}`}>
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  {(isAreaChartDataAvailable || isBarChartDataAvailable) && field.icon && (
                    <FlexItem grow={false}>
                      <EuiIcon
                        color={field.color}
                        data-test-subj="stat-icon"
                        size="l"
                        type={field.icon}
                      />
                    </FlexItem>
                  )}

                  <FlexItem>
                    <StatValue>
                      <p data-test-subj="stat-title">
                        {field.value != null ? field.value.toLocaleString() : getEmptyTagValue()}{' '}
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
                <BarChart barChart={barChart} configs={barchartConfigs()} />
              </FlexItem>
            )}

            {enableAreaChart && from != null && to != null && (
              <FlexItem>
                <AreaChart
                  areaChart={areaChart}
                  configs={areachartConfigs({
                    xTickFormatter: niceTimeFormatter([from, to]),
                    onBrushEnd: narrowDateRange,
                  })}
                />
              </FlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      </FlexItem>
    );
  }
);

StatItemsComponent.displayName = 'StatItemsComponent';
