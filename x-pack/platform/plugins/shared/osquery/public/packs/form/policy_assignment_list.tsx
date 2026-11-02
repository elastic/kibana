/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduce } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { useController, useWatch } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiSearchBar,
} from '@elastic/eui';
import type { EuiSearchBarOnChangeArgs, Query } from '@elastic/eui';
import { PLUGIN_ID as FLEET_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { useAgentPolicies } from '../../agent_policies';
import { useKibana } from '../../common/lib/kibana';

interface PolicyRow {
  id: string;
  name: string;
  description: string;
  agents: number;
  // Synthesized from a saved policy_id that Fleet did not return, so there is
  // no Fleet page to link to.
  isOrphan: boolean;
}

const EMPTY_POLICY_ROWS: PolicyRow[] = [];

// Shared by the table and by the bulk actions, so the rows a user sees and the
// rows Select all acts on are always the same set.
const EXECUTE_QUERY_OPTIONS = { defaultFields: ['name', 'description'] };

const shardAssignedTooltip = i18n.translate('xpack.osquery.pack.policyList.shardAssignedTooltip', {
  defaultMessage:
    'This policy already receives the pack through partial deployment (shards). Remove it from the shards section to assign it here instead.',
});

interface CheckboxCellProps {
  policyId: string;
  policyName: string;
  checked: boolean;
  disabled: boolean;
  isShardAssigned: boolean;
  onToggle: (id: string) => void;
}

const CheckboxCell: React.FC<CheckboxCellProps> = React.memo(
  ({ policyId, policyName, checked, disabled, isShardAssigned, onToggle }) => {
    const handleChange = useCallback(() => onToggle(policyId), [onToggle, policyId]);

    const tipAnchorProps = useMemo(
      () => ({ 'data-test-subj': `shardAssignedTooltip-${policyId}` }),
      [policyId]
    );

    const checkbox = (
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

    if (!isShardAssigned) {
      return checkbox;
    }

    // The reason sits on its own focusable trigger rather than on the disabled
    // checkbox: a disabled input takes no focus, so a tooltip wrapping it is
    // unreachable by keyboard and screen readers.
    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>{checkbox}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="question"
            position="right"
            content={shardAssignedTooltip}
            anchorProps={tipAnchorProps}
            aria-label={i18n.translate('xpack.osquery.pack.policyList.shardAssignedIconAriaLabel', {
              defaultMessage: 'Why {name} cannot be selected',
              values: { name: policyName },
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

CheckboxCell.displayName = 'CheckboxCell';

const unavailablePolicyTooltip = i18n.translate(
  'xpack.osquery.pack.policyList.unavailablePolicyTooltip',
  {
    defaultMessage:
      'This policy is no longer available in Fleet. Un-check it to remove it from this pack.',
  }
);

interface UnavailablePolicyCellProps {
  policyId: string;
  policyName: string;
}

const UnavailablePolicyCell: React.FC<UnavailablePolicyCellProps> = React.memo(
  ({ policyId, policyName }) => {
    const tipAnchorProps = useMemo(
      () => ({ 'data-test-subj': `policyUnavailableTip-${policyId}` }),
      [policyId]
    );

    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.osquery.pack.policyList.policyUnavailable"
              defaultMessage="Unavailable"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="question"
            position="left"
            content={unavailablePolicyTooltip}
            anchorProps={tipAnchorProps}
            aria-label={i18n.translate(
              'xpack.osquery.pack.policyList.unavailablePolicyIconAriaLabel',
              {
                defaultMessage: 'Why {name} is unavailable',
                values: { name: policyName },
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

UnavailablePolicyCell.displayName = 'UnavailablePolicyCell';

interface DescriptionCellProps {
  description: string;
}

const DescriptionCell: React.FC<DescriptionCellProps> = React.memo(({ description }) => (
  <EuiText size="s" color="subdued" className="eui-textTruncate">
    {description}
  </EuiText>
));

DescriptionCell.displayName = 'DescriptionCell';

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
  const { getUrlForApp, capabilities } = useKibana().services.application;
  // The policy list is fetched with Osquery privileges only, so a user can see
  // rows here without being allowed to open the Fleet policy details page.
  const canReadFleetPolicies = !!capabilities.fleetv2?.agent_policies_read;
  const { data: { agentPoliciesById } = {}, isFetching, isError } = useAgentPolicies();

  const {
    field: { onChange, value: selectedIds },
  } = useController<PolicyAssignmentFormValues, 'policy_ids'>({
    name: 'policy_ids',
    defaultValue: [],
  });

  // No `defaultValue`: react-hook-form only reads `_defaultValues` on the first
  // render when it is omitted, so passing one would mask a seeded `shards`.
  const shards = useWatch<PolicyAssignmentFormValues, 'shards'>({ name: 'shards' });

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
      description: policy.description ?? '',
      agents: policy.agents ?? 0,
      isOrphan: false,
    }));
  }, [agentPoliciesById]);

  // Saved policy_ids that Fleet no longer returns still need a row so the
  // user can uncheck them individually (Select all must not silently drop them).
  //
  // Keyed on the orphan id set rather than on `selectedIds` directly:
  // `EuiInMemoryTable` resets to page 1 whenever the `items` reference changes,
  // so toggling a known policy must not produce a new `allPolicies` array.
  const orphanIdsKey = useMemo(
    () =>
      (selectedIds ?? [])
        .filter((id) => !agentPoliciesById?.[id])
        .sort()
        .join('\u0000'),
    [selectedIds, agentPoliciesById]
  );

  const orphanPolicies = useMemo<PolicyRow[]>(
    () =>
      orphanIdsKey
        ? orphanIdsKey
            .split('\u0000')
            .map((id) => ({ id, name: id, description: '', agents: 0, isOrphan: true }))
        : EMPTY_POLICY_ROWS,
    [orphanIdsKey]
  );

  const allPolicies = useMemo<PolicyRow[]>(
    () => [...knownPolicies, ...orphanPolicies],
    [knownPolicies, orphanPolicies]
  );

  const selectedSet = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);

  // `EuiInMemoryTable` owns the search box, so mirror its query here to keep the
  // bulk actions scoped to the rows actually on screen.
  const [query, setQuery] = useState<Query | null>(null);

  const visiblePolicies = useMemo(
    () =>
      query ? EuiSearchBar.Query.execute(query, allPolicies, EXECUTE_QUERY_OPTIONS) : allPolicies,
    [query, allPolicies]
  );

  const isFiltered = visiblePolicies.length !== allPolicies.length;

  // Shard-targeted policies cannot be assigned here, so they are not part of
  // the "N of M selected" denominator unless they are already selected.
  const visibleAssignable = useMemo(
    () =>
      visiblePolicies.filter((policy) => !shardKeySet.has(policy.id) || selectedSet.has(policy.id)),
    [visiblePolicies, shardKeySet, selectedSet]
  );

  const visibleSelectedCount = useMemo(
    () => visibleAssignable.filter((policy) => selectedSet.has(policy.id)).length,
    [visibleAssignable, selectedSet]
  );

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

  // Both bulk actions operate on the rows currently matching the search, so a
  // filtered "Select all" cannot silently assign policies the user cannot see.
  // With no search active the visible set is every row, preserving the
  // unfiltered behaviour (including orphan ids, which are never invented here).
  const handleSelectAll = useCallback(() => {
    const idsToAdd = visiblePolicies
      .filter((policy) => !policy.isOrphan && !shardKeySet.has(policy.id))
      .map((policy) => policy.id);

    onChange(Array.from(new Set([...(selectedIds ?? []), ...idsToAdd])));
  }, [visiblePolicies, shardKeySet, selectedIds, onChange]);

  const handleUnselectAll = useCallback(() => {
    const visibleIds = new Set(visiblePolicies.map((policy) => policy.id));

    onChange((selectedIds ?? []).filter((id) => !visibleIds.has(id)));
  }, [visiblePolicies, selectedIds, onChange]);

  // `useAgentPolicies` uses `initialData: []`, so an empty map alone is not a
  // settled Fleet response — gate empty / error / loading on fetch status.
  // Orphan rows are synthesized from `policy_ids` and say nothing about the
  // request, so they must not be part of these conditions: a pack with saved
  // assignments would otherwise present a failed fetch as a complete list.
  const hasNoFleetPolicies = knownPolicies.length === 0;
  const hasNoPolicyRows = hasNoFleetPolicies && orphanPolicies.length === 0;
  const isInitialLoad = isFetching && hasNoFleetPolicies && !isError;
  const isLoadError = isError && hasNoFleetPolicies;

  // Until Fleet has answered, the visible rows are an incomplete picture of the
  // assignment, so editing it would save against data the user cannot see.
  const isAssignmentDisabled = isReadOnly || isInitialLoad || isLoadError;

  const columns = useMemo<Array<EuiBasicTableColumn<PolicyRow>>>(
    () => [
      {
        name: '',
        width: '64px',
        render: (item: PolicyRow) => {
          const isShardAssigned = shardKeySet.has(item.id) && !selectedSet.has(item.id);

          return (
            <CheckboxCell
              policyId={item.id}
              policyName={item.name}
              checked={selectedSet.has(item.id)}
              disabled={isAssignmentDisabled || isShardAssigned}
              isShardAssigned={isShardAssigned}
              onToggle={togglePolicy}
            />
          );
        },
      },
      {
        field: 'name',
        name: i18n.translate('xpack.osquery.pack.policyList.nameColumn', {
          defaultMessage: 'Policy name',
        }),
        sortable: true,
      },
      {
        field: 'description',
        name: i18n.translate('xpack.osquery.pack.policyList.descriptionColumn', {
          defaultMessage: 'Description',
        }),
        truncateText: true,
        render: (description: string) => <DescriptionCell description={description} />,
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
        name: '',
        width: '140px',
        align: 'right' as const,
        // Orphan rows have no Fleet page behind them, so linking would send the
        // user to a not-found screen.
        render: (item: PolicyRow) =>
          item.isOrphan ? (
            <UnavailablePolicyCell policyId={item.id} policyName={item.name} />
          ) : canReadFleetPolicies ? (
            <EuiLink
              href={getUrlForApp(FLEET_PLUGIN_ID, {
                path: pagePathGetters.policy_details({ policyId: item.id })[1],
              })}
              target="_blank"
              data-test-subj={`viewPolicy-${item.id}`}
            >
              <FormattedMessage
                id="xpack.osquery.pack.policyList.viewPolicyLink"
                defaultMessage="View policy"
              />
            </EuiLink>
          ) : null,
      },
    ],
    [
      selectedSet,
      togglePolicy,
      isAssignmentDisabled,
      getUrlForApp,
      shardKeySet,
      canReadFleetPolicies,
    ]
  );

  // Must return true: `EuiInMemoryTable` skips its own in-memory filtering for
  // any falsy return, so mirroring the query is not enough on its own.
  const handleSearchChange = useCallback(({ query: nextQuery }: EuiSearchBarOnChangeArgs) => {
    setQuery(nextQuery ?? null);

    return true;
  }, []);

  const search = useMemo(
    () => ({
      box: {
        incremental: true,
        placeholder: i18n.translate('xpack.osquery.pack.policyList.searchPlaceholder', {
          defaultMessage: 'Search policies',
        }),
        'data-test-subj': 'policyAssignmentSearch',
      },
      onChange: handleSearchChange,
    }),
    [handleSearchChange]
  );

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

  // Distinguish in-flight / failed fetch, "Fleet has no policies" (copy-only
  // empty prompt), and "the search matched nothing". Orphan rows alone still
  // populate the table.
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
          defaultMessage="Policies are matched by name or description. Clear or change the search to see the full list."
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
        {isLoadError && !hasNoPolicyRows && (
          <>
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              data-test-subj="policyAssignmentLoadError"
              title={i18n.translate('xpack.osquery.pack.policyList.partialErrorTitle', {
                defaultMessage: 'Unable to load agent policies',
              })}
            >
              <FormattedMessage
                id="xpack.osquery.pack.policyList.partialErrorBody"
                defaultMessage="Only the policies already assigned to this pack are listed. Reload before changing the assignment."
              />
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={handleSelectAll}
              disabled={isAssignmentDisabled || visibleAssignable.length === 0}
              data-test-subj="policyAssignmentSelectAll"
            >
              {isFiltered ? (
                <FormattedMessage
                  id="xpack.osquery.pack.policyList.selectAllMatching"
                  defaultMessage="Select all matching"
                />
              ) : (
                <FormattedMessage
                  id="xpack.osquery.pack.policyList.selectAll"
                  defaultMessage="Select all"
                />
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={handleUnselectAll}
              disabled={isAssignmentDisabled || visibleSelectedCount === 0}
              data-test-subj="policyAssignmentUnselectAll"
            >
              {isFiltered ? (
                <FormattedMessage
                  id="xpack.osquery.pack.policyList.unselectAllMatching"
                  defaultMessage="Un-select all matching"
                />
              ) : (
                <FormattedMessage
                  id="xpack.osquery.pack.policyList.unselectAll"
                  defaultMessage="Un-select all"
                />
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="subdued" data-test-subj="policyAssignmentCount">
              {isFiltered ? (
                <FormattedMessage
                  id="xpack.osquery.pack.policyList.selectionCountMatching"
                  defaultMessage="{selected} of {total} matching | {overall} selected | {agents, plural, one {# agent} other {# agents}} enrolled"
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  values={{
                    selected: visibleSelectedCount,
                    total: visibleAssignable.length,
                    overall: selectedSet.size,
                    agents: totalAgents,
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.osquery.pack.policyList.selectionCount"
                  defaultMessage="{selected} of {total} selected | {agents, plural, one {# agent} other {# agents}} enrolled"
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  values={{
                    selected: visibleSelectedCount,
                    total: visibleAssignable.length,
                    agents: totalAgents,
                  }}
                />
              )}
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
          executeQueryOptions={EXECUTE_QUERY_OPTIONS}
          data-test-subj="policyAssignmentTable"
        />
      </EuiPanel>
    </EuiFormRow>
  );
};

export const PolicyAssignmentList = React.memo(PolicyAssignmentListComponent);
