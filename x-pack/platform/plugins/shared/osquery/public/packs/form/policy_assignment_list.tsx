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
  EuiFormRow,
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
  policyName: string;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
}

const CheckboxCell: React.FC<CheckboxCellProps> = React.memo(
  ({ policyId, policyName, checked, disabled, onToggle }) => {
    const handleChange = useCallback(() => onToggle(policyId), [onToggle, policyId]);

    return (
      <EuiCheckbox
        id={`policy-checkbox-${policyId}`}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        aria-label={i18n.translate('xpack.osquery.pack.policyList.checkboxAriaLabel', {
          defaultMessage: 'Select policy {name}',
          values: { name: policyName },
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

interface PolicyAssignmentFormValues {
  policy_ids: string[];
  shards: Record<string, number>;
}

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
  const { data: { agentPoliciesById } = {}, isFetching, isError } = useAgentPolicies();

  const {
    field: { onChange, value: selectedIds },
  } = useController<PolicyAssignmentFormValues, 'policy_ids'>({
    name: 'policy_ids',
    defaultValue: [],
  });

  const {
    field: { value: shards },
  } = useController<PolicyAssignmentFormValues, 'shards'>({
    name: 'shards',
    defaultValue: {},
  });

  // Keys already assigned via partial (shard) deployment must not be newly
  // added to policy_ids — mirrors the shard half of availableOptions that
  // gated the old combobox. Empty keys and the global '*' sentinel are ignored.
  const shardKeySet = useMemo(
    () => new Set(Object.keys(shards ?? {}).filter((key) => key.length > 0 && key !== '*')),
    [shards]
  );

  const knownPolicies = useMemo<PolicyRow[]>(() => {
    if (!agentPoliciesById) return [];

    return Object.entries(agentPoliciesById).map(([id, policy]) => ({
      id,
      name: policy.name ?? id,
      agents: policy.agents ?? 0,
    }));
  }, [agentPoliciesById]);

  // Saved policy_ids that Fleet no longer returns still need a row so the
  // user can uncheck them individually (Select all must not silently drop them).
  const orphanPolicies = useMemo<PolicyRow[]>(() => {
    if (!selectedIds?.length) return [];

    return selectedIds
      .filter((id) => !agentPoliciesById?.[id])
      .map((id) => ({
        id,
        name: id,
        agents: 0,
      }));
  }, [selectedIds, agentPoliciesById]);

  const allPolicies = useMemo<PolicyRow[]>(
    () => [...knownPolicies, ...orphanPolicies],
    [knownPolicies, orphanPolicies]
  );

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
      } else if (shardKeySet.has(policyId)) {
        // Refuse to newly add a shard key into policy_ids. Removals above are
        // always allowed so a wrongly-present overlap can still be cleared.
        return;
      } else {
        next.add(policyId);
      }

      onChange(Array.from(next));
    },
    [selectedIds, onChange, shardKeySet]
  );

  const handleSelectAll = useCallback(() => {
    const knownSelectableIds = knownPolicies
      .filter((policy) => !shardKeySet.has(policy.id))
      .map((policy) => policy.id);
    // Preserve orphan ids the user has not cleared; never invent new ones.
    const orphanIdsToKeep = (selectedIds ?? []).filter((id) => !agentPoliciesById?.[id]);

    onChange(Array.from(new Set([...knownSelectableIds, ...orphanIdsToKeep])));
  }, [knownPolicies, shardKeySet, selectedIds, agentPoliciesById, onChange]);

  const handleUnselectAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const selectionCountValues = useMemo(
    () => ({
      selected: selectedSet.size,
      total: allPolicies.length,
      agents: totalAgents,
    }),
    [selectedSet.size, allPolicies.length, totalAgents]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<PolicyRow>>>(
    () => [
      {
        field: 'id',
        name: '',
        width: '40px',
        render: (_id: string, item: PolicyRow) => (
          <CheckboxCell
            policyId={item.id}
            policyName={item.name}
            checked={selectedSet.has(item.id)}
            disabled={isReadOnly || (shardKeySet.has(item.id) && !selectedSet.has(item.id))}
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
    [selectedSet, togglePolicy, isReadOnly, getUrlForApp, shardKeySet]
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

  // `allPolicies` comes from `Object.entries` over the Fleet response, so
  // without an explicit default sort a server-side reorder silently reshuffles
  // the rows between refetches.
  const sorting = useMemo(
    () => ({ sort: { field: 'name' as const, direction: 'asc' as const } }),
    []
  );

  const pagination = useMemo(
    () => ({
      initialPageSize: 10,
      pageSizeOptions: [10, 25, 50],
    }),
    []
  );

  // `useAgentPolicies` uses `initialData: []`, so an empty map alone is not a
  // settled Fleet response — gate CTA / error / loading on fetch status.
  const hasNoPolicyRows = knownPolicies.length === 0 && orphanPolicies.length === 0;
  const isInitialLoad = isFetching && hasNoPolicyRows && !isError;
  const isLoadError = isError && hasNoPolicyRows;

  // Distinguish in-flight / failed fetch, "Fleet has no policies", and "the
  // search matched nothing". The Fleet CTA is only for a successful empty
  // response. Orphan rows alone still populate the table.
  const emptyMessage = isInitialLoad ? (
    <EuiEmptyPrompt
      title={
        <h3>
          <FormattedMessage
            id="xpack.osquery.pack.policyList.loadingTitle"
            defaultMessage="Loading agent policies"
          />
        </h3>
      }
      body={
        <FormattedMessage
          id="xpack.osquery.pack.policyList.loadingBody"
          defaultMessage="Fetching agent policies from Fleet."
        />
      }
    />
  ) : isLoadError ? (
    <EuiEmptyPrompt
      title={
        <h3>
          <FormattedMessage
            id="xpack.osquery.pack.policyList.errorTitle"
            defaultMessage="Unable to load agent policies"
          />
        </h3>
      }
      body={
        <FormattedMessage
          id="xpack.osquery.pack.policyList.errorBody"
          defaultMessage="There was an error loading agent policies. Please try again."
        />
      }
    />
  ) : hasNoPolicyRows ? (
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
  ) : (
    <EuiEmptyPrompt
      title={
        <h3>
          <FormattedMessage
            id="xpack.osquery.pack.policyList.noSearchResultsTitle"
            defaultMessage="No policies match your search"
          />
        </h3>
      }
      body={
        <FormattedMessage
          id="xpack.osquery.pack.policyList.noSearchResultsBody"
          defaultMessage="Policies are matched by name. Clear or change the search to see the full list."
        />
      }
    />
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.pack.form.agentPoliciesFieldLabel', {
        defaultMessage: 'Scheduled agent policies (optional)',
      })}
      helpText={
        <FormattedMessage
          id="xpack.osquery.pack.form.agentPoliciesFieldHelpText"
          defaultMessage="Queries in this pack are scheduled for agents in the selected policies."
        />
      }
      fullWidth
    >
      <EuiPanel hasBorder paddingSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={handleSelectAll}
              disabled={isReadOnly || knownPolicies.length === 0}
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
          sorting={sorting}
          loading={isInitialLoad}
          noItemsMessage={emptyMessage}
          executeQueryOptions={executeQueryOptions}
          data-test-subj="policyAssignmentTable"
        />
      </EuiPanel>
    </EuiFormRow>
  );
};

export const PolicyAssignmentList = React.memo(PolicyAssignmentListComponent);
