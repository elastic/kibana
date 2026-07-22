/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

// -- Data types --

interface ChainStep {
  label: string;
  status: 'success' | 'failed' | 'warning';
}

interface FailingChain {
  id: string;
  chain: string;
  steps: ChainStep[];
  occurrences: number;
  lastSeen: string;
  status: 'failed' | 'warning';
}

const MOCK_CHAINS: FailingChain[] = [
  {
    id: '1',
    chain: 'High CPU alert executed → Slack notifications failed',
    steps: [
      { label: 'High CPU alert', status: 'success' },
      { label: 'Slack notifications', status: 'failed' },
    ],
    occurrences: 87,
    lastSeen: '2 min ago',
    status: 'failed',
  },
  {
    id: '2',
    chain: 'Memory threshold executed → PagerDuty escalation failed',
    steps: [
      { label: 'Memory threshold', status: 'success' },
      { label: 'PagerDuty escalation', status: 'failed' },
    ],
    occurrences: 42,
    lastSeen: '5 min ago',
    status: 'failed',
  },
  {
    id: '3',
    chain: 'Disk usage monitor executed → Email digest dispatched to → Cleanup workflow',
    steps: [
      { label: 'Disk usage monitor', status: 'success' },
      { label: 'Email digest', status: 'warning' },
      { label: 'Cleanup workflow', status: 'warning' },
    ],
    occurrences: 31,
    lastSeen: '12 min ago',
    status: 'warning',
  },
  {
    id: '4',
    chain: 'Error rate spike executed → Slack notifications failed',
    steps: [
      { label: 'Error rate spike', status: 'success' },
      { label: 'Slack notifications', status: 'failed' },
    ],
    occurrences: 28,
    lastSeen: '18 min ago',
    status: 'failed',
  },
  {
    id: '5',
    chain: 'Network latency executed → PagerDuty escalation dispatched to → Incident triage workflow',
    steps: [
      { label: 'Network latency', status: 'success' },
      { label: 'PagerDuty escalation', status: 'warning' },
      { label: 'Incident triage workflow', status: 'warning' },
    ],
    occurrences: 15,
    lastSeen: '25 min ago',
    status: 'warning',
  },
];

// -- Inline sequence map (CSS-based) --

const statusIconMap: Record<string, { type: string; color: string }> = {
  success: { type: 'checkInCircleFilled', color: 'success' },
  failed: { type: 'error', color: 'danger' },
  warning: { type: 'warning', color: 'warning' },
};

const SequenceArrow: React.FC<{ color: string }> = ({ color }) => (
  <svg width="48" height="16" viewBox="0 0 48 16" css={css({ flexShrink: 0 })}>
    <line x1="0" y1="8" x2="40" y2="8" stroke={color} strokeWidth="2" />
    <polygon points="40,4 48,8 40,12" fill={color} />
  </svg>
);

const FailureSequenceMap: React.FC<{ steps: ChainStep[] }> = ({ steps }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false} wrap>
      {steps.map((step, i) => {
        const icon = statusIconMap[step.status] ?? statusIconMap.success;
        const arrowColor =
          i < steps.length - 1 && steps[i + 1].status === 'failed'
            ? euiTheme.colors.danger
            : euiTheme.colors.lightShade;

        return (
          <React.Fragment key={i}>
            <EuiFlexItem grow={false}>
              <EuiPanel
                hasBorder
                hasShadow={false}
                paddingSize="s"
                css={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: euiTheme.size.s,
                  borderColor: step.status === 'failed' ? euiTheme.colors.danger : undefined,
                })}
              >
                <EuiIcon type={icon.type} color={icon.color} size="m" />
                <EuiText size="xs" css={css({ fontWeight: 600, whiteSpace: 'nowrap' })}>
                  {step.label}
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
            {i < steps.length - 1 && (
              <EuiFlexItem grow={false}>
                <SequenceArrow color={arrowColor} />
              </EuiFlexItem>
            )}
          </React.Fragment>
        );
      })}
    </EuiFlexGroup>
  );
};

// -- Main component --

export const TopFailing: React.FC = () => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const itemIdToExpandedRowMap = useMemo(() => {
    const map: Record<string, React.ReactNode> = {};
    for (const chain of MOCK_CHAINS) {
      if (expandedIds.has(chain.id)) {
        map[chain.id] = (
          <div css={css({ padding: '4px 0 8px 0' })}>
            <EuiText size="xs" color="subdued" css={css({ marginBottom: 8 })}>
              {i18n.translate('xpack.alertingV2.executionHistory.topFailing.sequenceMapLabel', {
                defaultMessage: 'Failure sequence',
              })}
            </EuiText>
            <FailureSequenceMap steps={chain.steps} />
          </div>
        );
      }
    }
    return map;
  }, [expandedIds]);

  const columns: Array<EuiBasicTableColumn<FailingChain>> = useMemo(
    () => [
      {
        field: 'id',
        name: '',
        width: '40px',
        render: (id: string) => (
          <EuiButtonIcon
            iconType={expandedIds.has(id) ? 'arrowDown' : 'arrowRight'}
            aria-label={expandedIds.has(id) ? 'Collapse sequence map' : 'Expand sequence map'}
            onClick={() => toggleRow(id)}
            size="xs"
            color="text"
          />
        ),
      },
      {
        field: 'chain',
        name: i18n.translate('xpack.alertingV2.executionHistory.topFailing.chainColumn', {
          defaultMessage: 'Execution chain',
        }),
        render: (chain: string, item: FailingChain) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon
                type={item.status === 'failed' ? 'error' : 'warning'}
                color={item.status === 'failed' ? 'danger' : 'warning'}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">{chain}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'occurrences',
        name: i18n.translate('xpack.alertingV2.executionHistory.topFailing.occurrencesColumn', {
          defaultMessage: 'Occurrences',
        }),
        width: '120px',
        render: (count: number) => (
          <EuiBadge color={count > 50 ? 'danger' : 'warning'}>{count}</EuiBadge>
        ),
      },
      {
        field: 'lastSeen',
        name: i18n.translate('xpack.alertingV2.executionHistory.topFailing.lastSeenColumn', {
          defaultMessage: 'Last seen',
        }),
        width: '120px',
      },
    ],
    [expandedIds, toggleRow]
  );

  return (
    <EuiPanel hasBorder data-test-subj="topFailingPanel">
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.alertingV2.executionHistory.topFailing.title', {
            defaultMessage: 'Top failing',
          })}
        </h3>
      </EuiTitle>

      <EuiBasicTable<FailingChain>
        items={MOCK_CHAINS}
        itemId="id"
        columns={columns}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        tableLayout="auto"
        data-test-subj="topFailingTable"
      />
    </EuiPanel>
  );
};
