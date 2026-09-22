/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduce } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { useController } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiCheckbox,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { useAgentPolicies } from '../../agent_policies';
import { useKibana } from '../../common/lib/kibana';

interface PolicyRow {
  id: string;
  name: string;
  agents: number;
}

interface CheckboxCellProps {
  policyId: string;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
}

const CheckboxCell: React.FC<CheckboxCellProps> = React.memo(
  ({ policyId, checked, disabled, onToggle }) => {
    const handleChange = useCallback(() => onToggle(policyId), [onToggle, policyId]);

    return (
      <EuiCheckbox
        id={`policy-checkbox-${policyId}`}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        aria-label={i18n.translate('xpack.osquery.pack.policyList.checkboxAriaLabel', {
          defaultMessage: 'Select policy',
        })}
      />
    );
  }
);

CheckboxCell.displayName = 'CheckboxCell';

interface AgentCountCellProps {
  count: number;
}

const AgentCountCell: React.FC<AgentCountCellProps> = React.memo(({ count }) => (
  <EuiText size="s" color="subdued">
    <FormattedMessage
      id="xpack.osquery.pack.policyList.agentsCount"
      defaultMessage="{count, plural, one {# agent} other {# agents}}"
      // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
      values={{ count }}
    />
  </EuiText>
));

AgentCountCell.displayName = 'AgentCountCell';

interface PolicyAssignmentListProps {
  isReadOnly?: boolean;
}

const tableCaption = i18n.translate('xpack.osquery.pack.policyList.tableCaption', {
  defaultMessage: 'Agent policies for pack assignment',
});

const PolicyAssignmentListComponent: React.FC<PolicyAssignmentListProps> = ({
  isReadOnly = false,
}) => {
  const getUrlForApp = useKibana().services.application.getUrlForApp;
  const { data: { agentPoliciesById } = {} } = useAgentPolicies();

  const {
    field: { onChange, value: selectedIds },
  } = useController<{ policy_ids: string[] }>({
    name: 'policy_ids',
    defaultValue: [],
  });

  const allPolicies = useMemo<PolicyRow[]>(() => {
    if (!agentPoliciesById) return [];

    return Object.entries(agentPoliciesById).map(([id, policy]) => ({
      id,
      name: policy.name ?? id,
      agents: policy.agents ?? 0,
    }));
  }, [agentPoliciesById]);

  const selectedSet = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);

  const totalAgents = useMemo(
    () =>
      reduce(
        selectedIds ?? [],
        (acc, policyId) => acc + (agentPoliciesById?.[policyId]?.agents ?? 0),
        0
      ),
    [selectedIds, agentPoliciesById]
  );

  const togglePolicy = useCallback(
    (policyId: string) => {
      const next = new Set(selectedIds ?? []);
      if (next.has(policyId)) {
        next.delete(policyId);
      } else {
        next.add(policyId);
      }

      onChange(Array.from(next));
    },
    [selectedIds, onChange]
  );

  const handleSelectAll = useCallback(() => {
    onChange(allPolicies.map((p) => p.id));
  }, [allPolicies, onChange]);

  const handleUnselectAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const columns = useMemo<Array<EuiBasicTableColumn<PolicyRow>>>(
    () => [
      {
        field: 'id',
        name: '',
        width: '40px',
        render: (id: string) => (
          <CheckboxCell
            policyId={id}
            checked={selectedSet.has(id)}
            disabled={isReadOnly}
            onToggle={togglePolicy}
          />
        ),
      },
      {
        field: 'name',
        name: i18n.translate('xpack.osquery.pack.policyList.nameColumn', {
          defaultMessage: 'Policy name',
        }),
        sortable: true,
      },
      {
        field: 'agents',
        name: i18n.translate('xpack.osquery.pack.policyList.agentsColumn', {
          defaultMessage: 'Agents enrolled',
        }),
        width: '140px',
        align: 'right' as const,
        render: (agents: number) => <AgentCountCell count={agents} />,
      },
      {
        field: 'id',
        name: '',
        width: '120px',
        align: 'right' as const,
        render: (id: string) => (
          <EuiLink
            href={getUrlForApp(PLUGIN_ID, {
              path: pagePathGetters.policy_details({ policyId: id })[1],
            })}
            target="_blank"
            data-test-subj={`viewPolicy-${id}`}
          >
            <FormattedMessage
              id="xpack.osquery.pack.policyList.viewPolicyLink"
              defaultMessage="View policy"
            />
          </EuiLink>
        ),
      },
    ],
    [selectedSet, togglePolicy, isReadOnly, getUrlForApp]
  );

  const search = useMemo(
    () => ({
      box: {
        incremental: true,
        placeholder: i18n.translate('xpack.osquery.pack.policyList.searchPlaceholder', {
          defaultMessage: 'Search policies',
        }),
      },
    }),
    []
  );

  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  const executeQueryOptions = useMemo(() => ({ defaultFields: ['name'] }), []);

  const pagination = useMemo(
    () => ({
      initialPageSize: 10,
      pageSizeOptions: [10, 25, 50],
    }),
    []
  );

  const emptyMessage = (
    <EuiEmptyPrompt
      title={
        <h3>
          <FormattedMessage
            id="xpack.osquery.pack.policyList.emptyTitle"
            defaultMessage="No agent policies found"
          />
        </h3>
      }
      body={
        <FormattedMessage
          id="xpack.osquery.pack.policyList.emptyBody"
          defaultMessage="Create an agent policy in Fleet to assign it to this pack."
        />
      }
    />
  );

  const selectionCountValues = useMemo(
    () => ({ selected: selectedSet.size, total: allPolicies.length, agents: totalAgents }),
    [selectedSet.size, allPolicies.length, totalAgents]
  );

  return (
    <EuiPanel hasBorder paddingSize="s">
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            onClick={handleSelectAll}
            disabled={isReadOnly || allPolicies.length === 0}
            data-test-subj="policyAssignmentSelectAll"
          >
            <FormattedMessage
              id="xpack.osquery.pack.policyList.selectAll"
              defaultMessage="Select all"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            onClick={handleUnselectAll}
            disabled={isReadOnly || selectedSet.size === 0}
            data-test-subj="policyAssignmentUnselectAll"
          >
            <FormattedMessage
              id="xpack.osquery.pack.policyList.unselectAll"
              defaultMessage="Un-select all"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued" data-test-subj="policyAssignmentCount">
            <FormattedMessage
              id="xpack.osquery.pack.policyList.selectionCount"
              defaultMessage="{selected} of {total} selected | {agents, plural, one {# agent} other {# agents}} enrolled"
              values={selectionCountValues}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiInMemoryTable
        tableCaption={tableCaption}
        items={allPolicies}
        columns={columns}
        search={search}
        pagination={pagination}
        sorting={true}
        noItemsMessage={emptyMessage}
        executeQueryOptions={executeQueryOptions}
        data-test-subj="policyAssignmentTable"
      />
    </EuiPanel>
  );
};

export const PolicyAssignmentList = React.memo(PolicyAssignmentListComponent);
