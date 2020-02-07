/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { IIndexPattern } from 'src/plugins/data/public';
import {
  MetricsExplorerMetric,
  MetricsExplorerAggregation,
} from '../../../server/routes/metrics_explorer/types';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
  MetricsExplorerChartOptions,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { Toolbar } from '../eui/toolbar';
import { MetricsExplorerKueryBar } from './kuery_bar';
import { MetricsExplorerMetrics } from './metrics';
import { MetricsExplorerGroupBy } from './group_by';
import { MetricsExplorerAggregationPicker } from './aggregation';
import { MetricsExplorerChartOptions as MetricsExplorerChartOptionsComponent } from './chart_options';
import { SavedViewsToolbarControls } from '../saved_views/toolbar_control';
import { MetricExplorerViewState } from '../../pages/infrastructure/metrics_explorer/use_metric_explorer_state';
import { metricsExplorerViewSavedObjectType } from '../../../common/saved_objects/metrics_explorer_view';

interface Props {
  derivedIndexPattern: IIndexPattern;
  timeRange: MetricsExplorerTimeOptions;
  options: MetricsExplorerOptions;
  chartOptions: MetricsExplorerChartOptions;
  defaultViewState: MetricExplorerViewState;
  onRefresh: () => void;
  onTimeChange: (start: string, end: string) => void;
  onGroupByChange: (groupBy: string | null) => void;
  onFilterQuerySubmit: (query: string) => void;
  onMetricsChange: (metrics: MetricsExplorerMetric[]) => void;
  onAggregationChange: (aggregation: MetricsExplorerAggregation) => void;
  onChartOptionsChange: (chartOptions: MetricsExplorerChartOptions) => void;
  onViewStateChange: (vs: MetricExplorerViewState) => void;
}

export const MetricsExplorerToolbar = ({
  timeRange,
  derivedIndexPattern,
  options,
  onTimeChange,
  onRefresh,
  onGroupByChange,
  onFilterQuerySubmit,
  onMetricsChange,
  onAggregationChange,
  chartOptions,
  onChartOptionsChange,
  defaultViewState,
  onViewStateChange,
}: Props) => {
  const isDefaultOptions = options.aggregation === 'avg' && options.metrics.length === 0;
  return (
    <Toolbar>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={options.aggregation === 'count' ? 2 : false}>
          <MetricsExplorerAggregationPicker
            fullWidth
            options={options}
            onChange={onAggregationChange}
          />
        </EuiFlexItem>
        {options.aggregation !== 'count' && (
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.infra.metricsExplorer.aggregationLabel"
              defaultMessage="of"
            />
          </EuiText>
        )}
        {options.aggregation !== 'count' && (
          <EuiFlexItem grow={2}>
            <MetricsExplorerMetrics
              autoFocus={isDefaultOptions}
              fields={derivedIndexPattern.fields}
              options={options}
              onChange={onMetricsChange}
            />
          </EuiFlexItem>
        )}
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.infra.metricsExplorer.groupByToolbarLabel"
            defaultMessage="graph per"
          />
        </EuiText>
        <EuiFlexItem grow={1}>
          <MetricsExplorerGroupBy
            onChange={onGroupByChange}
            fields={derivedIndexPattern.fields}
            options={options}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <MetricsExplorerKueryBar
            derivedIndexPattern={derivedIndexPattern}
            onSubmit={onFilterQuerySubmit}
            value={options.filterQuery}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricsExplorerChartOptionsComponent
            onChange={onChartOptionsChange}
            chartOptions={chartOptions}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SavedViewsToolbarControls
            defaultViewState={defaultViewState}
            viewState={{
              options,
              chartOptions,
              currentTimerange: timeRange,
            }}
            viewType={metricsExplorerViewSavedObjectType}
            onViewChange={onViewStateChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginRight: 5 }}>
          <EuiSuperDatePicker
            start={timeRange.from}
            end={timeRange.to}
            onTimeChange={({ start, end }) => onTimeChange(start, end)}
            onRefresh={onRefresh}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Toolbar>
  );
};
