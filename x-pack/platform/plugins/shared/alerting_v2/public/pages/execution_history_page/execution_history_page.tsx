/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ActionPolicyDetailsFlyoutContainer } from '../../components/action_policy/details_flyout/action_policy_details_flyout_container';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useFetchExecutionHistory } from '../../hooks/use_fetch_execution_history';
import type { PolicyExecutionHistoryItem } from '../../services/execution_history_api';

const POLICIES_TAB_ID = 'policies';
const RULES_TAB_ID = 'rules';

type TabId = typeof POLICIES_TAB_ID | typeof RULES_TAB_ID;

const buildColumns = (
  onPolicyClick: (policyId: string) => void
): Array<EuiBasicTableColumn<PolicyExecutionHistoryItem>> => [
  {
    field: '@timestamp',
    name: i18n.translate('xpack.alertingV2.executionHistory.columns.timestamp', {
      defaultMessage: 'Timestamp',
    }),
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
    render: (item: PolicyExecutionHistoryItem) => item.rule.name ?? item.rule.id,
  },
  {
    field: 'outcome',
    name: i18n.translate('xpack.alertingV2.executionHistory.columns.outcome', {
      defaultMessage: 'Outcome',
    }),
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
              <EuiBadge color="hollow">{w.name ?? w.id}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      );
    },
  },
];

const policiesEmptyState = (
  <EuiEmptyPrompt
    iconType="clock"
    title={
      <h2>
        <FormattedMessage
          id="xpack.alertingV2.executionHistory.emptyTitle"
          defaultMessage="No policy execution activity in the last 24 hours."
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.alertingV2.executionHistory.emptyBody"
          defaultMessage="Summary events appear here after the dispatcher evaluates episodes against a policy."
        />
      </p>
    }
  />
);

const rulesPlaceholder = (
  <EuiEmptyPrompt
    iconType="visGauge"
    title={
      <h2>
        <FormattedMessage
          id="xpack.alertingV2.executionHistory.rulesTab.placeholderTitle"
          defaultMessage="Rules execution history is not available yet."
        />
      </h2>
    }
  />
);

const DEFAULT_PER_PAGE = 50;

export const ExecutionHistoryPage = () => {
  useBreadcrumbs('execution_history_list');

  const [selectedTabId, setSelectedTabId] = useState<TabId>(POLICIES_TAB_ID);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [policyToViewId, setPolicyToViewId] = useState<string | null>(null);

  const { data, isFetching, isError, refetch } = useFetchExecutionHistory({
    page: page + 1,
    perPage,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const columns = buildColumns(setPolicyToViewId);

  const onTableChange = ({
    page: tablePage,
  }: CriteriaWithPagination<PolicyExecutionHistoryItem>) => {
    if (tablePage) {
      setPage(tablePage.index);
      setPerPage(tablePage.size);
    }
  };

  const pagination = {
    pageIndex: page,
    pageSize: perPage,
    totalItemCount: total,
    pageSizeOptions: [10, 25, 50, 100],
  };

  const tabs: Array<{ id: TabId; label: string }> = [
    {
      id: POLICIES_TAB_ID,
      label: i18n.translate('xpack.alertingV2.executionHistory.tabs.policiesLabel', {
        defaultMessage: 'Policies',
      }),
    },
    // {
    //   id: RULES_TAB_ID,
    //   label: i18n.translate('xpack.alertingV2.executionHistory.tabs.rulesLabel', {
    //     defaultMessage: 'Rules',
    //   }),
    // },
  ];

  return (
    <>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.executionHistory.pageTitle"
            defaultMessage="Execution history"
          />
        }
      />
      <EuiSpacer size="l" />
      <EuiTabs>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={tab.id === selectedTabId}
            onClick={() => setSelectedTabId(tab.id)}
          >
            {tab.label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {selectedTabId === POLICIES_TAB_ID ? (
        isError ? (
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="error"
            title={
              <FormattedMessage
                id="xpack.alertingV2.executionHistory.errorTitle"
                defaultMessage="Failed to load execution history."
              />
            }
          >
            <EuiButton
              color="danger"
              onClick={() => refetch()}
              data-test-subj="executionHistoryRetryButton"
            >
              <FormattedMessage
                id="xpack.alertingV2.executionHistory.retryButton"
                defaultMessage="Retry"
              />
            </EuiButton>
          </EuiCallOut>
        ) : (
          <EuiBasicTable<PolicyExecutionHistoryItem>
            items={items}
            columns={columns}
            loading={isFetching}
            noItemsMessage={policiesEmptyState}
            pagination={pagination}
            onChange={onTableChange}
          />
        )
      ) : (
        rulesPlaceholder
      )}
      {policyToViewId && (
        <ActionPolicyDetailsFlyoutContainer
          policyId={policyToViewId}
          onClose={() => setPolicyToViewId(null)}
        />
      )}
    </>
  );
};
