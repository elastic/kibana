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
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

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

const MiniBarChart: React.FC<{
  data: Array<{ label: string; values: Array<{ value: number; color: string }> }>;
  height?: number;
}> = ({ data, height = 100 }) => {
  const maxValue = Math.max(
    ...data.map((d) => d.values.reduce((sum, v) => sum + v.value, 0))
  );

  return (
    <div css={css({ display: 'flex', flexDirection: 'column', height: '100%' })}>
      <div
        css={css({
          display: 'flex',
          alignItems: 'flex-end',
          gap: 3,
          height,
          flex: 1,
        })}
      >
        {data.map((bar, i) => {
          const total = bar.values.reduce((sum, v) => sum + v.value, 0);
          const barHeight = maxValue > 0 ? (total / maxValue) * 100 : 0;
          return (
            <div
              key={i}
              css={css({
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                height: '100%',
              })}
              title={`${bar.label}: ${bar.values.map((v) => v.value).join(' / ')}`}
            >
              <div
                css={css({
                  height: `${barHeight}%`,
                  minHeight: total > 0 ? 2 : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '2px 2px 0 0',
                  overflow: 'hidden',
                })}
              >
                {bar.values.map((v, j) => (
                  <div
                    key={j}
                    css={css({
                      flex: v.value,
                      backgroundColor: v.color,
                    })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div
        css={css({
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
        })}
      >
        <EuiText size="xs" color="subdued">
          {data[0]?.label}
        </EuiText>
        <EuiText size="xs" color="subdued">
          {data[data.length - 1]?.label}
        </EuiText>
      </div>
    </div>
  );
};

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

const separatorCss = (borderColor: string) =>
  css({
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: borderColor,
    flexShrink: 0,
  });

const secondaryStatCss = css({
  '.euiStat__title': { fontSize: '1rem' },
});

const ChartLegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <div css={css({ width: 8, height: 8, borderRadius: 2, backgroundColor: color })} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">{label}</EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const StatsWithCharts: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const borderColor = euiTheme.colors.lightShade;

  const executionChartData = MOCK_EXECUTION_BARS.map((b) => ({
    label: b.hour,
    values: [
      { value: b.success, color: euiTheme.colors.vis.euiColorVis0 },
      { value: b.failed, color: euiTheme.colors.vis.euiColorVis9 },
    ],
  }));

  const failureChartData = MOCK_FAILURE_BARS.map((b) => ({
    label: b.hour,
    values: [
      { value: b.rules, color: euiTheme.colors.vis.euiColorVis9 },
      { value: b.policies, color: euiTheme.colors.vis.euiColorVis5 },
    ],
  }));

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem>
        <EuiPanel hasBorder data-test-subj="executionKpisExecutionsPanel">
          <EuiFlexGroup gutterSize="none" responsive={false} css={css({ height: '100%' })}>
            <EuiFlexItem grow={false} css={css({ padding: `0 ${euiTheme.size.m}`, minWidth: 130 })}>
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
            <div css={separatorCss(borderColor)} />
            <EuiFlexItem css={css({ padding: `0 ${euiTheme.size.m}` })}>
              <EuiText size="xs" css={css({ marginBottom: 4 })}>
                <strong>
                  {i18n.translate(
                    'xpack.alertingV2.executionHistory.kpis.executionsOverTime',
                    { defaultMessage: 'Executions over time' }
                  )}
                </strong>
                <EuiText size="xs" color="subdued" css={css({ display: 'inline', marginLeft: 8 })}>
                  Last 24 hours
                </EuiText>
              </EuiText>
              <MiniBarChart data={executionChartData} height={72} />
              <EuiFlexGroup gutterSize="m" responsive={false} css={css({ marginTop: 4 })}>
                <EuiFlexItem grow={false}>
                  <ChartLegendDot color={euiTheme.colors.vis.euiColorVis0} label="Success" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ChartLegendDot color={euiTheme.colors.vis.euiColorVis9} label="Failed" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder data-test-subj="executionKpisFailuresPanel">
          <EuiFlexGroup gutterSize="none" responsive={false} css={css({ height: '100%' })}>
            <EuiFlexItem grow={false} css={css({ padding: `0 ${euiTheme.size.m}`, minWidth: 130 })}>
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
            <div css={separatorCss(borderColor)} />
            <EuiFlexItem css={css({ padding: `0 ${euiTheme.size.m}` })}>
              <EuiText size="xs" css={css({ marginBottom: 4 })}>
                <strong>
                  {i18n.translate(
                    'xpack.alertingV2.executionHistory.kpis.failuresOverTime',
                    { defaultMessage: 'Failures over time' }
                  )}
                </strong>
                <EuiText size="xs" color="subdued" css={css({ display: 'inline', marginLeft: 8 })}>
                  Last 24 hours
                </EuiText>
              </EuiText>
              <MiniBarChart data={failureChartData} height={72} />
              <EuiFlexGroup gutterSize="m" responsive={false} css={css({ marginTop: 4 })}>
                <EuiFlexItem grow={false}>
                  <ChartLegendDot color={euiTheme.colors.vis.euiColorVis9} label="Rules" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ChartLegendDot color={euiTheme.colors.vis.euiColorVis5} label="Policies" />
                </EuiFlexItem>
              </EuiFlexGroup>
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
