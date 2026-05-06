/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import type { PolicyExecutionHistoryItem } from '../../../services/execution_history_api';
import { PoliciesEmptyState } from './empty_state';
import { ExecutionHistoryErrorState } from './error_state';

const buildColumns = (
  onPolicyClick: (policyId: string) => void,
  onRuleClick: (ruleId: string) => void,
  getWorkflowUrl: (workflowId: string) => string,
  formatTimestamp: (value: string) => string
): Array<EuiBasicTableColumn<PolicyExecutionHistoryItem>> => [
  {
    field: '@timestamp',
    name: i18n.translate('xpack.alertingV2.executionHistory.columns.timestamp', {
      defaultMessage: 'Timestamp',
    }),
    render: (value: string) => formatTimestamp(value),
  },
  {
    name: i18n.translate('xpack.alertingV2.executionHistory.columns.policy', {
      defaultMessage: 'Policy',
    }),
    render: (item: PolicyExecutionHistoryItem) => (
      <EuiLink onClick={() => onPolicyClick(item.policy.id)}>
        {item.policy.name ?? item.policy.id}
      </EuiLink>
    ),
  },
  {
    name: i18n.translate('xpack.alertingV2.executionHistory.columns.rule', {
      defaultMessage: 'Rule',
    }),
    render: (item: PolicyExecutionHistoryItem) => (
      <EuiLink onClick={() => onRuleClick(item.rule.id)}>{item.rule.name ?? item.rule.id}</EuiLink>
    ),
  },
  {
    field: 'outcome',
    name: i18n.translate('xpack.alertingV2.executionHistory.columns.outcome', {
      defaultMessage: 'Outcome',
    }),
    render: (outcome: PolicyExecutionHistoryItem['outcome']) => (
      <EuiBadge color="hollow" iconType={outcome === 'dispatched' ? 'check' : 'clock'}>
        {outcome}
      </EuiBadge>
    ),
  },
  {
    field: 'episode_count',
    name: i18n.translate('xpack.alertingV2.executionHistory.columns.episodes', {
      defaultMessage: 'Episodes',
    }),
  },
  {
    field: 'action_group_count',
    name: i18n.translate('xpack.alertingV2.executionHistory.columns.actionGroups', {
      defaultMessage: 'Action groups',
    }),
  },
  {
    field: 'workflows',
    name: i18n.translate('xpack.alertingV2.executionHistory.columns.workflows', {
      defaultMessage: 'Workflows',
    }),
    render: (workflows: PolicyExecutionHistoryItem['workflows']) => {
      if (workflows.length === 0) return null;
      return (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {workflows.map((w) => (
            <EuiFlexItem key={w.id} grow={false}>
              <EuiBadge
                color="hollow"
                iconType="workflow"
                href={getWorkflowUrl(w.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {w.name ?? w.id}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      );
    },
  },
];

interface Props {
  items: PolicyExecutionHistoryItem[];
  isFetching: boolean;
  isError: boolean;
  page: number;
  perPage: number;
  totalEvents: number;
  onTableChange: (criteria: CriteriaWithPagination<PolicyExecutionHistoryItem>) => void;
  onRetry: () => void;
  onPolicyClick: (policyId: string) => void;
  onRuleClick: (ruleId: string) => void;
}

export const PoliciesTabContent = ({
  items,
  isFetching,
  isError,
  page,
  perPage,
  totalEvents,
  onTableChange,
  onRetry,
  onPolicyClick,
  onRuleClick,
}: Props) => {
  const application = useService(CoreStart('application'));
  const settings = useService(CoreStart('settings'));
  const dateTimeFormat = settings.client.get<string>('dateFormat');

  if (isError) {
    return <ExecutionHistoryErrorState onRetry={onRetry} />;
  }

  const getWorkflowUrl = (workflowId: string) =>
    application.getUrlForApp(WORKFLOWS_APP_ID, { path: `/${workflowId}` });
  const formatTimestamp = (value: string) => moment(value).format(dateTimeFormat);

  const columns = buildColumns(onPolicyClick, onRuleClick, getWorkflowUrl, formatTimestamp);

  return (
    <EuiBasicTable<PolicyExecutionHistoryItem>
      items={items}
      columns={columns}
      loading={isFetching}
      noItemsMessage={<PoliciesEmptyState />}
      pagination={{
        pageIndex: page,
        pageSize: perPage,
        totalItemCount: totalEvents,
        pageSizeOptions: [10, 25, 50, 100],
      }}
      onChange={onTableChange}
    />
  );
};
