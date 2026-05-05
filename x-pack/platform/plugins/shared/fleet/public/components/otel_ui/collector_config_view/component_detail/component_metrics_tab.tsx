/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import { EuiLoadingChart, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { OTelComponentType } from '../graph_view/constants';

import type { MetricGroup } from './use_component_metrics';
import { useComponentMetrics } from './use_component_metrics';

interface ComponentMetricsTabProps {
  componentId: string;
  componentType: OTelComponentType;
}

const SUPPORTED_METRIC_TYPES: OTelComponentType[] = [
  'exporter',
  'processor',
  'receiver',
  'connector',
];

const CHART_HEIGHT = 200;

const scrollContainerStyle = css`
  overflow-y: auto;
  max-height: 390px;
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
  const { groups, isLoading, error } = useComponentMetrics({ componentId, componentType });
  const chartBaseTheme = useElasticChartsTheme();

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

  const nonEmptyGroups = groups.filter((g) => g.series.length > 0);

  if (nonEmptyGroups.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="otelComponentDetailMetricsNoData">
        {i18n.translate('xpack.fleet.otelUi.componentDetail.metrics.noData', {
          defaultMessage: 'No metrics data available for the last 15 minutes.',
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
