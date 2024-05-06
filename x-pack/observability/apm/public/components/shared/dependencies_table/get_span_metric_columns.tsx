/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ChartType,
  getTimeSeriesColor,
} from '../charts/helper/get_timeseries_color';
import { ListMetric } from '../list_metric';
import { ITableColumn } from '../managed_table';
import { FETCH_STATUS, isPending } from '../../../hooks/use_fetcher';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../common/utils/formatters';
import { Coordinate } from '../../../../typings/timeseries';
import { ImpactBar } from '../impact_bar';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';

export interface SpanMetricGroup {
  latency: number | null;
  throughput: number | null;
  failureRate: number | null;
  impact: number | null;
  currentStats:
    | {
        latency: Coordinate[];
        throughput: Coordinate[];
        failureRate: Coordinate[];
      }
    | undefined;
  previousStats:
    | {
        latency: Coordinate[];
        throughput: Coordinate[];
        failureRate: Coordinate[];
        impact: number;
      }
    | undefined;
}

export function getSpanMetricColumns({
  comparisonFetchStatus,
  shouldShowSparkPlots,
}: {
  comparisonFetchStatus: FETCH_STATUS;
  shouldShowSparkPlots: boolean;
}): Array<ITableColumn<SpanMetricGroup>> {
  const isLoading = isPending(comparisonFetchStatus);

  return [
    {
      field: 'latency',
      name: i18n.translate('xpack.apm.dependenciesTable.columnLatency', {
        defaultMessage: 'Latency (avg.)',
      }),
      align: RIGHT_ALIGNMENT,
      render: (_, { latency, currentStats, previousStats }) => {
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.LATENCY_AVG
        );

        return (
          <ListMetric
            compact
            color={currentPeriodColor}
            hideSeries={!shouldShowSparkPlots}
            isLoading={isLoading}
            series={currentStats?.latency}
            comparisonSeries={previousStats?.latency}
            valueLabel={asMillisecondDuration(latency)}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'throughput',
      name: i18n.translate('xpack.apm.dependenciesTable.columnThroughput', {
        defaultMessage: 'Throughput',
      }),
      align: RIGHT_ALIGNMENT,
      render: (_, { throughput, currentStats, previousStats }) => {
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.THROUGHPUT
        );

        return (
          <ListMetric
            compact
            color={currentPeriodColor}
            hideSeries={!shouldShowSparkPlots}
            isLoading={isLoading}
            series={currentStats?.throughput}
            comparisonSeries={previousStats?.throughput}
            valueLabel={asTransactionRate(throughput)}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'failureRate',
      name: (
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.dependenciesTable.columnErrorRateTip',
            {
              defaultMessage:
                "The percentage of failed transactions for the selected service. HTTP server transactions with a 4xx status code (client error) aren't considered failures because the caller, not the server, caused the failure.",
            }
          )}
        >
          <>
            {i18n.translate('xpack.apm.dependenciesTable.columnErrorRate', {
              defaultMessage: 'Failed transaction rate',
            })}
            &nbsp;
            <EuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="eui-alignCenter"
            />
          </>
        </EuiToolTip>
      ),
      align: RIGHT_ALIGNMENT,
      render: (_, { failureRate, currentStats, previousStats }) => {
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.FAILED_TRANSACTION_RATE
        );

        return (
          <ListMetric
            compact
            color={currentPeriodColor}
            hideSeries={!shouldShowSparkPlots}
            isLoading={isLoading}
            series={currentStats?.failureRate}
            comparisonSeries={previousStats?.failureRate}
            valueLabel={asPercent(failureRate, 1)}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'impact',
      name: (
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.dependenciesTable.columnImpactTip',
            {
              defaultMessage:
                'The most used and slowest endpoints in your service. Calculated by multiplying latency by throughput.',
            }
          )}
        >
          <>
            {i18n.translate('xpack.apm.dependenciesTable.columnImpact', {
              defaultMessage: 'Impact',
            })}
            &nbsp;
            <EuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="eui-alignCenter"
            />
          </>
        </EuiToolTip>
      ),
      align: RIGHT_ALIGNMENT,
      render: (_, { impact, previousStats }) => {
        return (
          <EuiFlexGroup alignItems="flexEnd" gutterSize="xs" direction="column">
            <EuiFlexItem>
              <ImpactBar value={impact ?? 0} size="m" />
            </EuiFlexItem>
            {previousStats && isFiniteNumber(previousStats.impact) && (
              <EuiFlexItem>
                <ImpactBar
                  value={previousStats.impact}
                  size="s"
                  color="subdued"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
      sortable: true,
    },
  ];
}
