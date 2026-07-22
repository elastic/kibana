/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

type MetricStatus = 'healthy' | 'warning' | 'danger';

const MOCK_HEALTH = {
  status: 'Warning' as const,
  utilization: 91.2,
  nodes: 3,
  capacity: 1000,
  claimedTasks: 912,
  queueDepth: 23,
  queueDelayMs: 1200,
  claimSuccessRate: 98.2,
  claimDurationMs: 45,
  topTasks: [
    { type: 'alerting:execute', avgDuration: '2.3s', executions: 1204, lastRun: '2m ago' },
    { type: 'actions:execute', avgDuration: '890ms', executions: 3421, lastRun: '1m ago' },
    { type: 'alerting_v2:evaluate', avgDuration: '340ms', executions: 892, lastRun: '30s ago' },
    { type: 'fleet:check-in', avgDuration: '120ms', executions: 5230, lastRun: '10s ago' },
    { type: 'reporting:execute', avgDuration: '4.1s', executions: 12, lastRun: '15m ago' },
  ],
};

function getUtilizationStatus(pct: number): MetricStatus {
  if (pct >= 95) return 'danger';
  if (pct >= 85) return 'warning';
  return 'healthy';
}

function getQueueDepthStatus(depth: number): MetricStatus {
  if (depth >= 100) return 'danger';
  if (depth >= 50) return 'warning';
  return 'healthy';
}

function getQueueDelayStatus(ms: number): MetricStatus {
  if (ms >= 10_000) return 'danger';
  if (ms >= 5_000) return 'warning';
  return 'healthy';
}

function getClaimRateStatus(pct: number): MetricStatus {
  if (pct < 90) return 'danger';
  if (pct < 95) return 'warning';
  return 'healthy';
}

function getClaimDurationStatus(ms: number): MetricStatus {
  if (ms >= 500) return 'danger';
  if (ms >= 100) return 'warning';
  return 'healthy';
}

const STATUS_COLOR: Record<MetricStatus, string> = {
  healthy: 'success',
  warning: 'warning',
  danger: 'danger',
};

const OVERALL_STATUS_COLOR: Record<string, string> = {
  OK: 'success',
  Warning: 'warning',
  Error: 'danger',
};

const statTitleColor = (s: MetricStatus) => (s === 'healthy' ? 'default' : 'danger');

const formatMs = (ms: number): string => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
};

interface ActionHintProps {
  status: MetricStatus;
  message: string;
}

const ActionHint: React.FC<ActionHintProps> = ({ status, message }) => {
  if (status === 'healthy') return null;
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} css={css({ marginTop: 8 })}>
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={status === 'danger' ? 'error' : 'warning'}
          color={status === 'danger' ? 'danger' : 'warning'}
          size="s"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs" color={STATUS_COLOR[status]}>
          {message}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface TopTask {
  type: string;
  avgDuration: string;
  executions: number;
  lastRun: string;
}

const topTaskColumns: Array<EuiBasicTableColumn<TopTask>> = [
  {
    field: 'type',
    name: 'Task type',
    width: '40%',
    render: (type: string) => (
      <EuiText size="xs">
        <code>{type}</code>
      </EuiText>
    ),
  },
  { field: 'avgDuration', name: 'Avg duration', width: '20%' },
  {
    field: 'executions',
    name: 'Executions',
    width: '20%',
    render: (n: number) => n.toLocaleString(),
  },
  { field: 'lastRun', name: 'Last run', width: '20%' },
];

export const TaskManagerHealth: React.FC = () => {
  const accordionId = useGeneratedHtmlId({ prefix: 'taskManagerHealth' });
  const { euiTheme } = useEuiTheme();

  const utilizationStatus = getUtilizationStatus(MOCK_HEALTH.utilization);
  const queueDepthStatus = getQueueDepthStatus(MOCK_HEALTH.queueDepth);
  const queueDelayStatus = getQueueDelayStatus(MOCK_HEALTH.queueDelayMs);
  const claimRateStatus = getClaimRateStatus(MOCK_HEALTH.claimSuccessRate);
  const claimDurationStatus = getClaimDurationStatus(MOCK_HEALTH.claimDurationMs);

  const capacityWorst: MetricStatus = [utilizationStatus, queueDepthStatus, queueDelayStatus].includes('danger')
    ? 'danger'
    : [utilizationStatus, queueDepthStatus, queueDelayStatus].includes('warning')
    ? 'warning'
    : 'healthy';

  const claimsWorst: MetricStatus = [claimRateStatus, claimDurationStatus].includes('danger')
    ? 'danger'
    : [claimRateStatus, claimDurationStatus].includes('warning')
    ? 'warning'
    : 'healthy';

  const buttonContent = (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.alertingV2.executionHistory.taskManagerHealth.title', {
              defaultMessage: 'Task Manager Health',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color={OVERALL_STATUS_COLOR[MOCK_HEALTH.status] ?? 'default'}>
          {MOCK_HEALTH.status}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={css({ width: 120 })}>
        <EuiProgress
          value={MOCK_HEALTH.utilization}
          max={100}
          color={STATUS_COLOR[utilizationStatus]}
          size="m"
          css={css({ borderRadius: euiTheme.border.radius.small })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color={STATUS_COLOR[utilizationStatus]}>
          <strong>{MOCK_HEALTH.utilization}%</strong>{' '}
          <EuiText size="xs" color="subdued" css={css({ display: 'inline' })}>
            utilization
          </EuiText>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{MOCK_HEALTH.claimedTasks}/{MOCK_HEALTH.capacity}</strong>{' '}
          <EuiText size="xs" color="subdued" css={css({ display: 'inline' })}>
            capacity
          </EuiText>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const sectionTitleCss = css({ marginBottom: 8 });

  return (
    <EuiPanel hasBorder>
      <EuiAccordion
        id={accordionId}
        buttonContent={buttonContent}
        initialIsOpen={false}
        css={css`
          .euiAccordion__triggerWrapper {
            padding: 0;
          }
        `}
      >
        <div css={css({ paddingTop: 16 })}>
          {/* Capacity & Queue metrics */}
          <EuiTitle size="xxxs" css={sectionTitleCss}>
            <h4>Capacity &amp; queue</h4>
          </EuiTitle>
          <EuiFlexGroup gutterSize="xl" responsive={false}>
            <EuiFlexItem>
              <EuiStat
                title={MOCK_HEALTH.queueDepth}
                description={
                  <EuiToolTip content="Number of tasks waiting to be claimed and executed">
                    <span>Queue depth</span>
                  </EuiToolTip>
                }
                titleColor={statTitleColor(queueDepthStatus)}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={formatMs(MOCK_HEALTH.queueDelayMs)}
                description={
                  <EuiToolTip content="How long the oldest task has been waiting in the queue">
                    <span>Queue delay</span>
                  </EuiToolTip>
                }
                titleColor={statTitleColor(queueDelayStatus)}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={`${MOCK_HEALTH.claimedTasks} / ${MOCK_HEALTH.capacity}`}
                description="Claimed / capacity"
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <ActionHint status={capacityWorst} message="Scale up — add more Kibana nodes to increase task throughput" />

          <EuiSpacer size="m" />

          {/* Task Claims */}
          <EuiTitle size="xxxs" css={sectionTitleCss}>
            <h4>Task claims</h4>
          </EuiTitle>
          <EuiFlexGroup gutterSize="xl" responsive={false}>
            <EuiFlexItem>
              <EuiStat
                title={`${MOCK_HEALTH.claimSuccessRate}%`}
                description={
                  <EuiToolTip content="Rate of successful task claims — low values indicate Elasticsearch issues">
                    <span>Success rate</span>
                  </EuiToolTip>
                }
                titleColor={statTitleColor(claimRateStatus)}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={`${(100 - MOCK_HEALTH.claimSuccessRate).toFixed(1)}%`}
                description={
                  <EuiToolTip content="Rate of failed task claims — elevated values suggest Elasticsearch connectivity problems">
                    <span>Failure rate</span>
                  </EuiToolTip>
                }
                titleColor={statTitleColor(claimRateStatus)}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={formatMs(MOCK_HEALTH.claimDurationMs)}
                description={
                  <EuiToolTip content="Average time to claim a task from Elasticsearch — high values indicate ES performance issues">
                    <span>Claim duration</span>
                  </EuiToolTip>
                }
                titleColor={statTitleColor(claimDurationStatus)}
                textAlign="left"
                reverse
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <ActionHint status={claimsWorst} message="Check Elasticsearch cluster health — claim issues indicate ES connectivity or performance problems" />

          <EuiSpacer size="m" />

          {/* Top Slowest Tasks */}
          <EuiTitle size="xxxs" css={sectionTitleCss}>
            <h4>Top slowest tasks</h4>
          </EuiTitle>
          <EuiBasicTable<TopTask>
            items={MOCK_HEALTH.topTasks}
            columns={topTaskColumns}
            tableLayout="auto"
            compressed
          />
          <EuiText size="xs" color="subdued" css={css({ marginTop: 8 })}>
            <EuiIcon type="iInCircle" size="s" css={css({ marginRight: 4 })} />
            Review execution frequency for the slowest tasks — similar to hot threads in Elasticsearch
          </EuiText>
        </div>
      </EuiAccordion>
    </EuiPanel>
  );
};
