/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  Chart,
  Settings,
  AreaSeries,
  ScaleType,
  Axis,
  Position,
  Tooltip,
  niceTimeFormatter,
} from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { css } from '@emotion/react';
import {
  EuiButtonGroup,
  EuiLoadingChart,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DETAIL_PANEL_CONTENT_MAX_HEIGHT } from '../graph_view/constants';
import type { OTelComponentType } from '../graph_view/constants';

import type { MetricGroup } from './use_component_metrics';
import { useComponentMetrics } from './use_component_metrics';

interface ComponentMetricsTabProps {
  componentId: string;
  componentType: OTelComponentType;
}

export const SUPPORTED_METRIC_TYPES: OTelComponentType[] = ['exporter', 'processor', 'receiver'];

type IntervalId = '5m' | '15m' | '1h';

interface IntervalOption {
  timeRangeMs: number;
  fixedInterval: string;
  description: string;
}

const INTERVAL_OPTIONS: Record<IntervalId, IntervalOption> = {
  '5m': {
    timeRangeMs: 5 * 60 * 1000,
    fixedInterval: '1m', // Using 1m interval as it's the minimum interval supported by otel collector
    description: i18n.translate('xpack.fleet.otelUi.componentDetail.metrics.interval5m', {
      defaultMessage: 'Last 5 minutes',
    }),
  },
  '15m': {
    timeRangeMs: 15 * 60 * 1000,
    fixedInterval: '1m',
    description: i18n.translate('xpack.fleet.otelUi.componentDetail.metrics.interval15m', {
      defaultMessage: 'Last 15 minutes',
    }),
  },
  '1h': {
    timeRangeMs: 60 * 60 * 1000,
    fixedInterval: '2m',
    description: i18n.translate('xpack.fleet.otelUi.componentDetail.metrics.interval1h', {
      defaultMessage: 'Last 1 hour',
    }),
  },
};

const INTERVAL_BUTTON_OPTIONS = (Object.keys(INTERVAL_OPTIONS) as IntervalId[]).map((id) => ({
  id,
  label: id,
  title: INTERVAL_OPTIONS[id].description,
}));

const DEFAULT_INTERVAL: IntervalId = '15m';

const CHART_HEIGHT = 200;

const scrollContainerStyle = css`
  overflow-y: auto;
  max-height: ${DETAIL_PANEL_CONTENT_MAX_HEIGHT}px;
`;

const loadingContainerStyle = css`
  height: ${CHART_HEIGHT}px;
`;

const GROUP_TITLES: Record<string, string> = {
  throughput: i18n.translate('xpack.fleet.otelUi.componentDetail.metrics.throughputTitle', {
    defaultMessage: 'Throughput (events/s)',
  }),
  errors: i18n.translate('xpack.fleet.otelUi.componentDetail.metrics.errorsTitle', {
    defaultMessage: 'Errors (events/s)',
  }),
  queue: i18n.translate('xpack.fleet.otelUi.componentDetail.metrics.queueTitle', {
    defaultMessage: 'Queue',
  }),
};

export const ComponentMetricsTab: React.FunctionComponent<ComponentMetricsTabProps> = ({
  componentId,
  componentType,
}) => {
  if (!SUPPORTED_METRIC_TYPES.includes(componentType)) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="otelComponentDetailMetricsUnsupported">
        {i18n.translate('xpack.fleet.otelUi.componentDetail.metrics.unsupported', {
          defaultMessage: 'Metrics are not yet available for this component type.',
        })}
      </EuiText>
    );
  }

  return <ComponentMetricsCharts componentId={componentId} componentType={componentType} />;
};

const ComponentMetricsCharts: React.FunctionComponent<ComponentMetricsTabProps> = ({
  componentId,
  componentType,
}) => {
  const [selectedInterval, setSelectedInterval] = useState<IntervalId>(DEFAULT_INTERVAL);
  const { timeRangeMs, fixedInterval, description } = INTERVAL_OPTIONS[selectedInterval];
  const { groups, isLoading, error } = useComponentMetrics({
    componentId,
    componentType,
    timeRangeMs,
    fixedInterval,
  });
  const chartBaseTheme = useElasticChartsTheme();

  const nonEmptyGroups = groups.filter((g) => g.series.length > 0);

  const renderContent = () => {
    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" css={loadingContainerStyle}>
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (error) {
      return (
        <EuiText size="s" color="danger" data-test-subj="otelComponentDetailMetricsError">
          {i18n.translate('xpack.fleet.otelUi.componentDetail.metrics.error', {
            defaultMessage: 'Failed to load metrics: {message}',
            values: { message: error.message },
          })}
        </EuiText>
      );
    }

    if (nonEmptyGroups.length === 0) {
      return (
        <EuiText size="s" color="subdued" data-test-subj="otelComponentDetailMetricsNoData">
          {i18n.translate('xpack.fleet.otelUi.componentDetail.metrics.noData', {
            defaultMessage: 'No metrics data available for the {timeRange}.',
            values: { timeRange: description.toLowerCase() },
          })}
        </EuiText>
      );
    }

    return (
      <div css={scrollContainerStyle}>
        {nonEmptyGroups.map((group, idx) => (
          <React.Fragment key={group.id}>
            {idx > 0 && <EuiSpacer size="l" />}
            <MetricChart group={group} chartBaseTheme={chartBaseTheme} />
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <>
      <EuiButtonGroup
        legend={i18n.translate('xpack.fleet.otelUi.componentDetail.metrics.intervalLegend', {
          defaultMessage: 'Time range',
        })}
        options={INTERVAL_BUTTON_OPTIONS}
        idSelected={selectedInterval}
        onChange={(id) => setSelectedInterval(id as IntervalId)}
        buttonSize="compressed"
        data-test-subj="otelComponentDetailMetricsIntervalPicker"
      />
      <EuiSpacer size="m" />
      {renderContent()}
    </>
  );
};

const MetricChart: React.FunctionComponent<{
  group: MetricGroup;
  chartBaseTheme: ReturnType<typeof useElasticChartsTheme>;
}> = ({ group, chartBaseTheme }) => {
  const { series } = group;
  let minTime = Infinity;
  let maxTime = -Infinity;
  for (const s of series) {
    for (const d of s.data) {
      if (d.x < minTime) minTime = d.x;
      if (d.x > maxTime) maxTime = d.x;
    }
  }
  const xDomain = { min: minTime, max: maxTime };
  const tickFormatter = niceTimeFormatter([minTime, maxTime]);

  return (
    <>
      <EuiText size="xs" color="subdued">
        <strong>{GROUP_TITLES[group.id] ?? group.id}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <Chart
        size={{ height: CHART_HEIGHT }}
        data-test-subj={`otelComponentDetailMetricsChart-${group.id}`}
      >
        <Settings
          showLegend={series.length > 1}
          legendPosition={Position.Bottom}
          baseTheme={chartBaseTheme}
          locale={i18n.getLocale()}
          xDomain={xDomain}
        />
        <Tooltip type="vertical" />
        <Axis
          id="bottom"
          position={Position.Bottom}
          tickFormat={tickFormatter}
          gridLine={{ visible: false }}
        />
        <Axis id="left" position={Position.Left} gridLine={{ visible: true }} />
        {series.map((s) => (
          <AreaSeries
            key={s.label}
            id={s.label}
            name={s.label}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={s.data}
          />
        ))}
      </Chart>
    </>
  );
};
