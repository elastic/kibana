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
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface FailingChain {
  id: string;
  chain: string;
  occurrences: number;
  lastSeen: string;
  status: 'failed' | 'warning';
}

const MOCK_CHAINS: FailingChain[] = [
  {
    id: '1',
    chain: 'High CPU alert executed → Slack notifications failed',
    occurrences: 87,
    lastSeen: '2 min ago',
    status: 'failed',
  },
  {
    id: '2',
    chain: 'Memory threshold executed → PagerDuty escalation failed',
    occurrences: 42,
    lastSeen: '5 min ago',
    status: 'failed',
  },
  {
    id: '3',
    chain: 'Disk usage monitor executed → Email digest dispatched to → Cleanup workflow',
    occurrences: 31,
    lastSeen: '12 min ago',
    status: 'warning',
  },
  {
    id: '4',
    chain: 'Error rate spike executed → Slack notifications failed',
    occurrences: 28,
    lastSeen: '18 min ago',
    status: 'failed',
  },
  {
    id: '5',
    chain: 'Network latency executed → PagerDuty escalation dispatched to → Incident triage workflow',
    occurrences: 15,
    lastSeen: '25 min ago',
    status: 'warning',
  },
];

const columns: Array<EuiBasicTableColumn<FailingChain>> = [
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
];

export const TopFailing: React.FC = () => {
  const accordionId = useGeneratedHtmlId({ prefix: 'topFailingSequenceMap' });

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
        columns={columns}
        tableLayout="auto"
        data-test-subj="topFailingTable"
      />

      <EuiAccordion
        id={accordionId}
        buttonContent={i18n.translate(
          'xpack.alertingV2.executionHistory.topFailing.sequenceMapLabel',
          { defaultMessage: 'Failure sequence map' }
        )}
        css={css`
          margin-top: 12px;
          .euiAccordion__triggerWrapper {
            padding: 0;
          }
        `}
        initialIsOpen={false}
      >
        <EuiCallOut
          size="s"
          color="subdued"
          css={css({ marginTop: 8 })}
          title={i18n.translate(
            'xpack.alertingV2.executionHistory.topFailing.sequenceMapPlaceholder',
            {
              defaultMessage:
                'Sequence map visualization will render here (React Flow + dagre layout)',
            }
          )}
        />
      </EuiAccordion>
    </EuiPanel>
  );
};
