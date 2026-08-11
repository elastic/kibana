/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiToolTip,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
  type EuiBadgeProps,
} from '@elastic/eui';
import moment from 'moment';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import type { PolicyExecutionOutcome } from '@kbn/alerting-v2-schemas';
import { UserCapabilities } from '../../../services/user_capabilities';
import type { PolicyExecutionHistoryItem } from '../../../services/execution_history_api';
import { RulesCell } from './rules_cell';
import * as i18n from '../translations';

const MAX_VISIBLE_RULES = 3;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const getOutcomeDisplay = (
  outcome: PolicyExecutionOutcome
): { color: EuiBadgeProps['color']; label: string } => {
  switch (outcome) {
    case 'dispatched':
      return {
        color: 'hollow',
        label: i18n.OUTCOME_DISPATCHED,
      };
    case 'throttled':
      return {
        color: 'hollow',
        label: i18n.OUTCOME_THROTTLED,
      };
    case 'dispatch_failed':
      return {
        color: 'danger',
        label: i18n.OUTCOME_FAILED,
      };
  }
};

const buildColumns = ({
  onPolicyClick,
  onRuleClick,
  activeRuleId,
  getWorkflowUrl,
  formatTimestamp,
  showEpisodeColumns,
  showRulesColumn,
  canReadRules,
  canReadActionPolicies,
}: {
  onPolicyClick: (policyId: string) => void;
  onRuleClick: (ruleId: string) => void;
  activeRuleId: string | null;
  getWorkflowUrl: (workflowId: string) => string;
  formatTimestamp: (value: string) => string;
  showEpisodeColumns: boolean;
  showRulesColumn: boolean;
  canReadRules: boolean;
  canReadActionPolicies: boolean;
}): Array<EuiBasicTableColumn<PolicyExecutionHistoryItem>> => [
  {
    field: 'dispatched_at',
    name: i18n.COLUMN_TIMESTAMP,
    render: (value: string) => formatTimestamp(value),
  },
  {
    name: i18n.COLUMN_POLICY,
    render: (item: PolicyExecutionHistoryItem) => {
      const label = item.policy.name ?? item.policy.id;
      return canReadActionPolicies ? (
        <EuiLink onClick={() => onPolicyClick(item.policy.id)}>{label}</EuiLink>
      ) : (
        <span>{label}</span>
      );
    },
  },
  {
    field: 'outcome',
    name: i18n.COLUMN_OUTCOME,
    render: (outcome: PolicyExecutionOutcome, item: PolicyExecutionHistoryItem) => {
      const { color, label } = getOutcomeDisplay(outcome);
      if (outcome === 'dispatch_failed') {
        return (
          <EuiToolTip content={item.error?.message}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiBadge color={color}>{label}</EuiBadge>
              </EuiFlexItem>
              {item.failure_reason && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">{item.failure_reason}</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiToolTip>
        );
      }
      return <EuiBadge color={color}>{label}</EuiBadge>;
    },
  },
  ...(showRulesColumn
    ? [
        {
          name: i18n.COLUMN_RULES,
          render: (item: PolicyExecutionHistoryItem) => (
            <RulesCell
              rules={item.rules}
              maxVisibleRules={MAX_VISIBLE_RULES}
              totalRuleCount={item.totalRuleCount}
              activeRuleId={activeRuleId}
              onRuleClick={onRuleClick}
              canReadRules={canReadRules}
            />
          ),
        },
      ]
    : []),
  ...(showEpisodeColumns
    ? [
        {
          field: 'episode_count',
          name: i18n.COLUMN_EPISODES,
        },
        {
          field: 'action_group_count',
          name: i18n.COLUMN_ACTION_GROUPS,
        },
      ]
    : []),
  {
    field: 'workflows',
    name: i18n.COLUMN_WORKFLOWS,
    render: (workflows: PolicyExecutionHistoryItem['workflows']) => {
      if (workflows.length === 0) return null;
      return (
        <EuiBadgeGroup gutterSize="xs">
          {workflows.map((w) => (
            <EuiBadge
              key={w.id}
              color="hollow"
              iconType="workflow"
              href={getWorkflowUrl(w.id)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ maxWidth: '100%' }}
            >
              {w.name ?? w.id}
            </EuiBadge>
          ))}
        </EuiBadgeGroup>
      );
    },
  },
];

interface Props {
  items: PolicyExecutionHistoryItem[];
  loading: boolean;
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  onChange: (criteria: CriteriaWithPagination<PolicyExecutionHistoryItem>) => void;
  onPolicyClick: (policyId: string) => void;
  onRuleClick?: (ruleId: string) => void;
  activeRuleId?: string | null;
  noItemsMessage: ReactNode;
  showEpisodeColumns?: boolean;
  showRulesColumn?: boolean;
  tableCaption?: string;
}

export const PoliciesExecutionHistoryTable = ({
  items,
  loading,
  pageIndex,
  pageSize,
  totalItemCount,
  onChange,
  onPolicyClick,
  onRuleClick = () => {},
  activeRuleId = null,
  noItemsMessage,
  showEpisodeColumns = true,
  showRulesColumn = true,
  tableCaption,
}: Props) => {
  const application = useService(CoreStart('application'));
  const settings = useService(CoreStart('settings'));
  const dateTimeFormat = settings.client.get<string>('dateFormat');
  const canReadRules = useService(UserCapabilities).canRead('rules');
  const canReadActionPolicies = useService(UserCapabilities).canRead('actionPolicies');

  const getWorkflowUrl = (workflowId: string) =>
    application.getUrlForApp(WORKFLOWS_APP_ID, { path: `/${workflowId}` });
  const formatTimestamp = (value: string) => moment(value).format(dateTimeFormat);

  const columns = buildColumns({
    onPolicyClick,
    onRuleClick,
    activeRuleId,
    getWorkflowUrl,
    formatTimestamp,
    showEpisodeColumns,
    showRulesColumn,
    canReadRules,
    canReadActionPolicies,
  });

  return (
    <EuiBasicTable<PolicyExecutionHistoryItem>
      tableCaption={tableCaption}
      items={items}
      columns={columns}
      loading={loading}
      noItemsMessage={noItemsMessage}
      pagination={{
        pageIndex,
        pageSize,
        totalItemCount,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
      }}
      onChange={onChange}
    />
  );
};
