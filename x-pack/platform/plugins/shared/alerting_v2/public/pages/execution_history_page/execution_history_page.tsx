/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiPageHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useFetchExecutionHistory } from '../../hooks/use_fetch_execution_history';
import type { PolicyExecutionHistoryItem } from '../../services/execution_history_api';

const POLICIES_TAB_ID = 'policies';
const RULES_TAB_ID = 'rules';

type TabId = typeof POLICIES_TAB_ID | typeof RULES_TAB_ID;

const columns: Array<EuiBasicTableColumn<PolicyExecutionHistoryItem>> = [
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
    render: (item: PolicyExecutionHistoryItem) => item.policy.name ?? item.policy.id,
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
    field: 'workflow_ids',
    name: i18n.translate('xpack.alertingV2.executionHistory.columns.workflows', {
      defaultMessage: 'Workflows',
    }),
    render: (workflowIds: string[]) => workflowIds.join(', '),
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

export const ExecutionHistoryPage = () => {
  useBreadcrumbs('execution_history_list');

  const [selectedTabId, setSelectedTabId] = useState<TabId>(POLICIES_TAB_ID);

  const { data, isFetching } = useFetchExecutionHistory();
  const items = data?.items ?? [];

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
        <EuiBasicTable<PolicyExecutionHistoryItem>
          items={items}
          columns={columns}
          loading={isFetching}
          noItemsMessage={policiesEmptyState}
        />
      ) : (
        rulesPlaceholder
      )}
    </>
  );
};
