/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import { useHistory } from 'react-router-dom';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingChart,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import {
  Axis,
  BarSeries,
  Chart,
  CurveType,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { getRouterLinkProps } from '@kbn/router-utils';
import { getRulesAppDetailsRoute } from '@kbn/rule-data-utils';
import { getTimeZone } from '@kbn/visualization-utils';
import { useKibana } from '../../../../common/lib/kibana';
import { formatMillisForDisplay } from '../../../lib/execution_duration_utils';
import type {
  ExecutionTrends,
  ExecutionTrendsFailingRule,
  ExecutionTrendsSlowRule,
} from '../../../lib/rule_api/load_global_execution_trends';
import {
  AVG_DURATION_COLUMN_TITLE,
  AVG_DURATION_TITLE,
  DURATION_SERIES_LABEL,
  EXECUTIONS_BY_OUTCOME_TITLE,
  EXECUTIONS_COLUMN_TITLE,
  FAILURES_COLUMN_TITLE,
  LAST_FAILURE_COLUMN_TITLE,
  NO_EXECUTIONS_MESSAGE,
  NO_FAILING_RULES_MESSAGE,
  OUTCOME_FAILURE_LABEL,
  OUTCOME_SUCCESS_LABEL,
  OUTCOME_UNKNOWN_LABEL,
  OUTCOME_WARNING_LABEL,
  RULE_COLUMN_TITLE,
  SLOWEST_RULES_TITLE,
  TOP_FAILING_RULES_TITLE,
} from '../translations';

const CHART_HEIGHT = 200;
const TOOLTIP_DATE_FORMAT = 'YYYY-MM-DD HH:mm';

/** Compact duration label for chart axes: `250 ms`, `1.5 s`, `2.3 min`. */
const formatDurationTick = (valueMs: number): string => {
  if (valueMs < 1000) {
    return `${Math.round(valueMs)} ms`;
  }
  if (valueMs < 60_000) {
    return `${Number((valueMs / 1000).toFixed(1))} s`;
  }
  return `${Number((valueMs / 60_000).toFixed(1))} min`;
};

interface ChartPoint {
  time: number;
  success: number;
  failure: number;
  warning: number;
  unknown: number;
  avgDurationMs: number;
}

export interface RuleHealthTrendsProps {
  trends?: ExecutionTrends;
  isLoading: boolean;
}

const ChartPanel = ({
  title,
  children,
  'data-test-subj': dataTestSubj,
}: {
  title: string;
  children: React.ReactNode;
  'data-test-subj': string;
}) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
    {children}
  </EuiPanel>
);

const EmptyChart = ({ message }: { message: string }) => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent="center"
    css={{ height: CHART_HEIGHT }}
    responsive={false}
  >
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        {message}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const LoadingChart = () => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent="center"
    css={{ height: CHART_HEIGHT }}
    responsive={false}
  >
    <EuiFlexItem grow={false}>
      <EuiLoadingChart size="l" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const RuleHealthTrends = ({ trends, isLoading }: RuleHealthTrendsProps) => {
  const history = useHistory();
  const { charts, uiSettings } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const baseTheme = charts.theme.useChartsBaseTheme();
  const timeZone = getTimeZone(uiSettings);
  const dateFormat = uiSettings.get<string>('dateFormat');

  const points = useMemo<ChartPoint[]>(
    () =>
      (trends?.buckets ?? []).map(({ timestamp, ...bucket }) => ({
        time: new Date(timestamp).getTime(),
        ...bucket,
      })),
    [trends]
  );
  const hasExecutions = points.some(
    (point) => point.success + point.failure + point.warning + point.unknown > 0
  );

  const ruleLink = (rule: { id: string; name: string }) => {
    const pathname = getRulesAppDetailsRoute(rule.id);
    const linkProps = getRouterLinkProps({
      href: history.createHref({ pathname }),
      onClick: () => history.push(pathname),
    });
    return (
      <EuiLink {...linkProps} data-test-subj="ruleHealthTrendsRuleLink">
        {rule.name || rule.id}
      </EuiLink>
    );
  };

  const failingColumns: Array<EuiBasicTableColumn<ExecutionTrendsFailingRule>> = [
    {
      field: 'name',
      name: RULE_COLUMN_TITLE,
      truncateText: true,
      render: (_, rule) => ruleLink(rule),
    },
    { field: 'failures', name: FAILURES_COLUMN_TITLE, width: '100px', align: 'right' },
    {
      field: 'lastFailure',
      name: LAST_FAILURE_COLUMN_TITLE,
      width: '180px',
      render: (value: string | null) => (value ? moment(value).format(dateFormat) : '-'),
    },
  ];

  const slowestColumns: Array<EuiBasicTableColumn<ExecutionTrendsSlowRule>> = [
    {
      field: 'name',
      name: RULE_COLUMN_TITLE,
      truncateText: true,
      render: (_, rule) => ruleLink(rule),
    },
    { field: 'executions', name: EXECUTIONS_COLUMN_TITLE, width: '100px', align: 'right' },
    {
      field: 'avgDurationMs',
      name: AVG_DURATION_COLUMN_TITLE,
      width: '140px',
      align: 'right',
      render: (value: number) => formatMillisForDisplay(value),
    },
  ];

  const settings = (
    <Settings
      baseTheme={baseTheme}
      locale={i18n.getLocale()}
      showLegend
      legendPosition={Position.Right}
    />
  );
  const tooltip = (
    <Tooltip
      headerFormatter={({ value }) => moment(value).format(dateFormat || TOOLTIP_DATE_FORMAT)}
    />
  );

  return (
    <div data-test-subj="ruleHealthTrends">
      <EuiFlexGroup>
        <EuiFlexItem>
          <ChartPanel title={EXECUTIONS_BY_OUTCOME_TITLE} data-test-subj="ruleHealthTrendsOutcomes">
            {isLoading && !trends ? (
              <LoadingChart />
            ) : !hasExecutions ? (
              <EmptyChart message={NO_EXECUTIONS_MESSAGE} />
            ) : (
              <Chart size={['100%', CHART_HEIGHT]}>
                {tooltip}
                {settings}
                <Axis id="bottom" position={Position.Bottom} gridLine={{ visible: false }} />
                <Axis id="left" position={Position.Left} integersOnly ticks={4} />
                <BarSeries
                  id="outcomes"
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="time"
                  yAccessors={['success', 'warning', 'failure', 'unknown']}
                  stackAccessors={['time']}
                  data={points}
                  timeZone={timeZone}
                  color={({ yAccessor }) =>
                    ({
                      success: euiTheme.colors.vis.euiColorVisSuccess0,
                      warning: euiTheme.colors.vis.euiColorVisWarning0,
                      failure: euiTheme.colors.vis.euiColorVisDanger0,
                      unknown: euiTheme.colors.vis.euiColorVisGrey0,
                    }[String(yAccessor)] ?? null)
                  }
                  name={({ yAccessor }) =>
                    ({
                      success: OUTCOME_SUCCESS_LABEL,
                      warning: OUTCOME_WARNING_LABEL,
                      failure: OUTCOME_FAILURE_LABEL,
                      unknown: OUTCOME_UNKNOWN_LABEL,
                    }[String(yAccessor)] ?? String(yAccessor))
                  }
                />
              </Chart>
            )}
          </ChartPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <ChartPanel title={AVG_DURATION_TITLE} data-test-subj="ruleHealthTrendsDuration">
            {isLoading && !trends ? (
              <LoadingChart />
            ) : !hasExecutions ? (
              <EmptyChart message={NO_EXECUTIONS_MESSAGE} />
            ) : (
              <Chart size={['100%', CHART_HEIGHT]}>
                {tooltip}
                {settings}
                <Axis id="bottom" position={Position.Bottom} gridLine={{ visible: false }} />
                <Axis
                  id="left"
                  position={Position.Left}
                  ticks={4}
                  tickFormat={(value) => formatDurationTick(value)}
                />
                <LineSeries
                  id="avgDuration"
                  name={DURATION_SERIES_LABEL}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="time"
                  yAccessors={['avgDurationMs']}
                  data={points}
                  timeZone={timeZone}
                  color={[euiTheme.colors.vis.euiColorVis0]}
                  curve={CurveType.CURVE_MONOTONE_X}
                  lineSeriesStyle={{ line: { strokeWidth: 2 }, point: { visible: 'never' } }}
                />
              </Chart>
            )}
          </ChartPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <ChartPanel title={TOP_FAILING_RULES_TITLE} data-test-subj="ruleHealthTrendsFailingRules">
            <EuiBasicTable
              tableCaption={TOP_FAILING_RULES_TITLE}
              items={trends?.topFailingRules ?? []}
              columns={failingColumns}
              loading={isLoading}
              noItemsMessage={NO_FAILING_RULES_MESSAGE}
              rowProps={() => ({ 'data-test-subj': 'ruleHealthTrendsFailingRuleRow' })}
            />
          </ChartPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <ChartPanel title={SLOWEST_RULES_TITLE} data-test-subj="ruleHealthTrendsSlowestRules">
            <EuiBasicTable
              tableCaption={SLOWEST_RULES_TITLE}
              items={trends?.slowestRules ?? []}
              columns={slowestColumns}
              loading={isLoading}
              noItemsMessage={NO_EXECUTIONS_MESSAGE}
              rowProps={() => ({ 'data-test-subj': 'ruleHealthTrendsSlowestRuleRow' })}
            />
          </ChartPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
