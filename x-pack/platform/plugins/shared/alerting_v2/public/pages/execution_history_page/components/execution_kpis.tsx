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
  EuiPanel,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import {
  Chart,
  Settings,
  BarSeries,
  ScaleType,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import type { PartialTheme } from '@elastic/charts';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';

const MOCK_DATA = {
  totalExecutions: 12_847,
  ruleExecutions: 9_421,
  policyExecutions: 3_426,
  failedExecutions: 342,
  failedRules: 5,
  failedPolicies: 3,
  failureRate: '2.7%',
};

const MOCK_EXECUTION_BARS = [
  { hour: '00:00', success: 420, failed: 12 },
  { hour: '02:00', success: 380, failed: 8 },
  { hour: '04:00', success: 395, failed: 15 },
  { hour: '06:00', success: 510, failed: 22 },
  { hour: '08:00', success: 680, failed: 45 },
  { hour: '10:00', success: 720, failed: 38 },
  { hour: '12:00', success: 690, failed: 28 },
  { hour: '14:00', success: 710, failed: 32 },
  { hour: '16:00', success: 650, failed: 42 },
  { hour: '18:00', success: 580, failed: 35 },
  { hour: '20:00', success: 490, failed: 25 },
  { hour: '22:00', success: 440, failed: 18 },
];

const MOCK_FAILURE_BARS = [
  { hour: '00:00', rules: 8, policies: 4 },
  { hour: '02:00', rules: 5, policies: 3 },
  { hour: '04:00', rules: 10, policies: 5 },
  { hour: '06:00', rules: 14, policies: 8 },
  { hour: '08:00', rules: 30, policies: 15 },
  { hour: '10:00', rules: 25, policies: 13 },
  { hour: '12:00', rules: 18, policies: 10 },
  { hour: '14:00', rules: 22, policies: 10 },
  { hour: '16:00', rules: 28, policies: 14 },
  { hour: '18:00', rules: 22, policies: 13 },
  { hour: '20:00', rules: 16, policies: 9 },
  { hour: '22:00', rules: 12, policies: 6 },
];

const StatsOnly: React.FC = () => (
  <EuiFlexGroup gutterSize="m">
    <EuiFlexItem>
      <EuiPanel hasBorder data-test-subj="executionKpisExecutionsPanel">
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.alertingV2.executionHistory.kpis.executionsTitle', {
              defaultMessage: 'All executions',
            })}
          </h3>
        </EuiTitle>
        <EuiFlexGroup gutterSize="m" responsive={false} wrap>
          <EuiFlexItem>
            <EuiStat
              title={MOCK_DATA.totalExecutions.toLocaleString()}
              description={i18n.translate(
                'xpack.alertingV2.executionHistory.kpis.totalExecutions',
                { defaultMessage: 'Total' }
              )}
              textAlign="left"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={MOCK_DATA.ruleExecutions.toLocaleString()}
              description={i18n.translate(
                'xpack.alertingV2.executionHistory.kpis.ruleExecutions',
                { defaultMessage: 'Rules' }
              )}
              textAlign="left"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={MOCK_DATA.policyExecutions.toLocaleString()}
              description={i18n.translate(
                'xpack.alertingV2.executionHistory.kpis.policyExecutions',
                { defaultMessage: 'Action policies' }
              )}
              textAlign="left"
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>

    <EuiFlexItem>
      <EuiPanel hasBorder data-test-subj="executionKpisFailuresPanel">
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.alertingV2.executionHistory.kpis.failuresTitle', {
              defaultMessage: 'Failures',
            })}
          </h3>
        </EuiTitle>
        <EuiFlexGroup gutterSize="m" responsive={false} wrap>
          <EuiFlexItem>
            <EuiStat
              title={MOCK_DATA.failedExecutions.toLocaleString()}
              description={i18n.translate(
                'xpack.alertingV2.executionHistory.kpis.failedTotal',
                { defaultMessage: 'Total failed' }
              )}
              textAlign="left"
              titleColor="danger"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={MOCK_DATA.failedRules}
              description={i18n.translate(
                'xpack.alertingV2.executionHistory.kpis.failingRules',
                { defaultMessage: 'Failing rules' }
              )}
              textAlign="left"
              titleColor="danger"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={MOCK_DATA.failedPolicies}
              description={i18n.translate(
                'xpack.alertingV2.executionHistory.kpis.failingPolicies',
                { defaultMessage: 'Failing policies' }
              )}
              textAlign="left"
              titleColor="danger"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={MOCK_DATA.failureRate}
              description={i18n.translate(
                'xpack.alertingV2.executionHistory.kpis.failureRate',
                { defaultMessage: 'Failure rate' }
              )}
              textAlign="left"
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const secondaryStatCss = css({
  '.euiStat__title': { fontSize: '1rem' },
});

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span css={css({ display: 'inline-flex', alignItems: 'center', gap: 4 })}>
    <span css={css({ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 })} />
    <EuiText size="xs" color="subdued">{label}</EuiText>
  </span>
);

const compactChartTheme: PartialTheme = {
  chartMargins: { left: 0, right: 0, top: 4, bottom: 0 },
  chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
  scales: { barsPadding: 0.25 },
  background: { color: 'transparent' },
  legend: { verticalWidth: 80 },
};

const StatsWithCharts: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const borderColor = euiTheme.colors.lightShade;
  const chartBaseTheme = useElasticChartsTheme();

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="none" data-test-subj="executionKpisExecutionsPanel">
          <EuiFlexGroup gutterSize="none" responsive={false} css={css({ height: '100%' })}>
            <EuiFlexItem
              grow={3}
              css={css({
                padding: euiTheme.size.m,
                backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                borderRight: `1px solid ${borderColor}`,
              })}
            >
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate('xpack.alertingV2.executionHistory.kpis.executionsTitle', {
                    defaultMessage: 'All executions',
                  })}
                </h3>
              </EuiTitle>
              <EuiStat
                title={MOCK_DATA.totalExecutions.toLocaleString()}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.totalExecutions',
                  { defaultMessage: 'Total' }
                )}
                textAlign="left"
                reverse
              />
              <EuiStat
                title={MOCK_DATA.ruleExecutions.toLocaleString()}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.ruleExecutions',
                  { defaultMessage: 'Rules' }
                )}
                textAlign="left"
                reverse
                css={secondaryStatCss}
              />
              <EuiStat
                title={MOCK_DATA.policyExecutions.toLocaleString()}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.policyExecutions',
                  { defaultMessage: 'Action policies' }
                )}
                textAlign="left"
                reverse
                css={secondaryStatCss}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={7} css={css({ padding: euiTheme.size.m, display: 'flex', flexDirection: 'column' })}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={css({ marginBottom: 4 })}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs"><strong>
                    {i18n.translate(
                      'xpack.alertingV2.executionHistory.kpis.executionsOverTime',
                      { defaultMessage: 'Executions over time' }
                    )}
                  </strong></EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <LegendDot color={euiTheme.colors.success} label="Success" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <LegendDot color={euiTheme.colors.danger} label="Failed" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued" css={css({ textAlign: 'right' })}>
                    Last 24 hours
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <div css={css({ flex: 1, minHeight: 140 })}>
                <Chart>
                  <Settings
                    theme={[compactChartTheme]}
                    baseTheme={chartBaseTheme}
                    showLegend={false}
                    locale={i18n.getLocale()}
                  />
                  <Tooltip type={TooltipType.VerticalCursor} />
                  <BarSeries
                    id="success"
                    name="Success"
                    xScaleType={ScaleType.Ordinal}
                    yScaleType={ScaleType.Linear}
                    xAccessor="hour"
                    yAccessors={['success']}
                    stackAccessors={[0]}
                    data={MOCK_EXECUTION_BARS}
                    color={[euiTheme.colors.success]}
                  />
                  <BarSeries
                    id="failed"
                    name="Failed"
                    xScaleType={ScaleType.Ordinal}
                    yScaleType={ScaleType.Linear}
                    xAccessor="hour"
                    yAccessors={['failed']}
                    stackAccessors={[0]}
                    data={MOCK_EXECUTION_BARS}
                    color={[euiTheme.colors.danger]}
                  />
                </Chart>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="none" data-test-subj="executionKpisFailuresPanel">
          <EuiFlexGroup gutterSize="none" responsive={false} css={css({ height: '100%' })}>
            <EuiFlexItem
              grow={3}
              css={css({
                padding: euiTheme.size.m,
                backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                borderRight: `1px solid ${borderColor}`,
              })}
            >
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate('xpack.alertingV2.executionHistory.kpis.failuresTitle', {
                    defaultMessage: 'Failures',
                  })}
                </h3>
              </EuiTitle>
              <EuiStat
                title={MOCK_DATA.failedExecutions.toLocaleString()}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.failedTotal',
                  { defaultMessage: 'Total failed' }
                )}
                textAlign="left"
                titleColor="danger"
                reverse
              />
              <EuiStat
                title={MOCK_DATA.failedRules}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.failingRules',
                  { defaultMessage: 'Failing rules' }
                )}
                textAlign="left"
                titleColor="danger"
                reverse
                css={secondaryStatCss}
              />
              <EuiStat
                title={MOCK_DATA.failureRate}
                description={i18n.translate(
                  'xpack.alertingV2.executionHistory.kpis.failureRate',
                  { defaultMessage: 'Failure rate' }
                )}
                textAlign="left"
                reverse
                css={secondaryStatCss}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={7} css={css({ padding: euiTheme.size.m, display: 'flex', flexDirection: 'column' })}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={css({ marginBottom: 4 })}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs"><strong>
                    {i18n.translate(
                      'xpack.alertingV2.executionHistory.kpis.failuresOverTime',
                      { defaultMessage: 'Failures over time' }
                    )}
                  </strong></EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <LegendDot color={euiTheme.colors.vis.euiColorVis2} label="Rules" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <LegendDot color={euiTheme.colors.vis.euiColorVis8} label="Policies" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued" css={css({ textAlign: 'right' })}>
                    Last 24 hours
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <div css={css({ flex: 1, minHeight: 140 })}>
                <Chart>
                  <Settings
                    theme={[compactChartTheme]}
                    baseTheme={chartBaseTheme}
                    showLegend={false}
                    locale={i18n.getLocale()}
                  />
                  <Tooltip type={TooltipType.VerticalCursor} />
                  <BarSeries
                    id="rules"
                    name="Rules"
                    xScaleType={ScaleType.Ordinal}
                    yScaleType={ScaleType.Linear}
                    xAccessor="hour"
                    yAccessors={['rules']}
                    stackAccessors={[0]}
                    data={MOCK_FAILURE_BARS}
                    color={[euiTheme.colors.vis.euiColorVis2]}
                  />
                  <BarSeries
                    id="policies"
                    name="Policies"
                    xScaleType={ScaleType.Ordinal}
                    yScaleType={ScaleType.Linear}
                    xAccessor="hour"
                    yAccessors={['policies']}
                    stackAccessors={[0]}
                    data={MOCK_FAILURE_BARS}
                    color={[euiTheme.colors.vis.euiColorVis8]}
                  />
                </Chart>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface ExecutionKpisProps {
  showCharts?: boolean;
}

export const ExecutionKpis: React.FC<ExecutionKpisProps> = ({ showCharts = false }) => {
  return showCharts ? <StatsWithCharts /> : <StatsOnly />;
};
