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
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiToolTip,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiSearchBar,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSearchBarOnChangeArgs, Query, UseEuiTheme } from '@elastic/eui';
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
  members?: PolicyRow[];
  // Set on a shared-integration row, whose `name` is its first member's name.
  integrationName?: string;
  searchTerms?: string;
}

const EMPTY_POLICY_ROWS: PolicyRow[] = [];

// Shared by the table and by the bulk actions, so the rows a user sees and the
// rows Select all acts on are always the same set.
const EXECUTE_QUERY_OPTIONS = { defaultFields: ['name', 'description', 'searchTerms'] };

const shardAssignedTooltip = i18n.translate('xpack.osquery.pack.policyList.shardAssignedTooltip', {
  defaultMessage:
    'This policy already receives the pack through partial deployment (shards). Remove it from the shards section to assign it here instead.',
});

interface CheckboxCellProps {
  policyId: string;
  policyName: string;
  accessibleName?: string;
  checked: boolean;
  disabled: boolean;
  isShardAssigned: boolean;
  onToggle: (id: string) => void;
}

const CheckboxCell: React.FC<CheckboxCellProps> = React.memo(
  ({ policyId, policyName, accessibleName, checked, disabled, isShardAssigned, onToggle }) => {
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
        aria-label={
          accessibleName ??
          i18n.translate('xpack.osquery.pack.policyList.checkboxAriaLabel', {
            defaultMessage: 'Select policy {name}',
            values: { name: policyName },
          })
        }
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

const popoverListCss = ({ euiTheme }: UseEuiTheme) => ({
  width: euiTheme.base * 26,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

const sharedPoliciesPanelProps = { 'data-test-subj': 'policyAssignmentSharedPoliciesPopover' };

interface SharedPoliciesPopoverProps {
  integrationName: string;
  members: PolicyRow[];
  renderMember: (member: PolicyRow) => React.ReactNode;
}

// Same shape as Fleet's MultipleAgentPoliciesSummaryLine: the row names one
// agent policy and a "+N" badge opens the full list of the integration's
// agent policies.
const SharedPoliciesPopover: React.FC<SharedPoliciesPopoverProps> = ({
  integrationName,
  members,
  renderMember,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((open) => !open), []);
  const close = useCallback(() => setIsOpen(false), []);
  const titleId = useGeneratedHtmlId({ prefix: 'sharedIntegrationPolicies' });

  return (
    <EuiPopover
      aria-labelledby={titleId}
      isOpen={isOpen}
      closePopover={close}
      anchorPosition="downCenter"
      panelProps={sharedPoliciesPanelProps}
      button={
        <EuiBadge
          color="hollow"
          onClick={toggle}
          onClickAriaLabel={i18n.translate(
            'xpack.osquery.pack.form.sharedIntegration.moreBadgeAriaLabel',
            {
              defaultMessage: 'Show the {count} agent policies of shared integration {name}',
              values: { count: members.length, name: integrationName },
            }
          )}
          data-test-subj="policyAssignmentSharedPoliciesBadge"
        >
          <FormattedMessage
            id="xpack.osquery.pack.form.sharedIntegration.moreBadge"
            defaultMessage="+{count}"
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            values={{ count: members.length - 1 }}
          />
        </EuiBadge>
      }
    >
      <EuiPopoverTitle id={titleId}>
        <FormattedMessage
          id="xpack.osquery.pack.form.sharedIntegration.popoverTitle"
          defaultMessage="Shared integration {name} is used by"
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          values={{ name: integrationName }}
        />
      </EuiPopoverTitle>
      <ul css={popoverListCss}>
        {members.map((member) => (
          <li key={member.id}>
            {renderMember(member)}
            <EuiSpacer size="xs" />
          </li>
        ))}
      </ul>
    </EuiPopover>
  );
};

interface PolicyAssignmentFormValues {
  policy_ids: string[];
  shards: Record<string, number>;
}

interface PolicyAssignmentListProps {
  receivingPolicyIds?: string[];
  isReadOnly?: boolean;
}

const tableCaption = i18n.translate('xpack.osquery.pack.policyList.tableCaption', {
  defaultMessage: 'Agent policies for pack assignment',
});

const PolicyAssignmentListComponent: React.FC<PolicyAssignmentListProps> = ({
  isReadOnly = false,
  receivingPolicyIds,
}) => {
  const { getUrlForApp, capabilities } = useKibana().services.application;
  // The policy list is fetched with Osquery privileges only, so a user can see
  // rows here without being allowed to open the Fleet policy details page.
  const canReadFleetPolicies = !!capabilities.fleetv2?.agent_policies_read;
  const {
    data: { agentPoliciesById, groupsByPackagePolicyId, groupIdByPolicyId } = {},
    isFetching,
    isError,
  } = useAgentPolicies();

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

  const allPolicies = useMemo<PolicyRow[]>(() => {
    const rows = knownPolicies.filter((policy) => !groupIdByPolicyId?.[policy.id]);
    for (const group of Object.values(groupsByPackagePolicyId ?? {})) {
      const members = knownPolicies
        .filter((policy) => group.policyIds.includes(policy.id))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (members.length === 0) continue;

      // Named after its first agent policy (like Fleet's shared-integration
      // summary), so the row sorts and reads like any other policy row.
      rows.push({
        id: group.id,
        name: members[0].name,
        description: members[0].description,
        agents: members.reduce((sum, { agents }) => sum + agents, 0),
        isOrphan: false,
        members,
        integrationName: group.name,
        searchTerms: [
          group.name,
          ...members.map(({ name, description }) => `${name} ${description}`),
        ].join(' '),
      });
    }

    return [...rows, ...orphanPolicies];
  }, [knownPolicies, orphanPolicies, groupsByPackagePolicyId, groupIdByPolicyId]);

  const selectedSet = useMemo(() => {
    const selected = new Set(selectedIds ?? []);
    for (const { policyIds } of Object.values(groupsByPackagePolicyId ?? {})) {
      if (policyIds.some((id) => selected.has(id))) {
        policyIds.forEach((id) => selected.add(id));
      }
    }

    return selected;
  }, [selectedIds, groupsByPackagePolicyId]);

  // Shard-keyed policies are explicit targets too: the form keeps them out of
  // `policy_ids` (they live in `shards`), so they must not be reported as
  // included only through the shared integration.
  const implicitPolicyIds = useMemo(() => {
    const explicit = new Set(selectedIds ?? []);

    return new Set([...selectedSet].filter((id) => !explicit.has(id) && !shardKeySet.has(id)));
  }, [selectedIds, selectedSet, shardKeySet]);

  const implicitPolicyNames = useMemo(
    () =>
      i18n.formatList(
        'conjunction',
        knownPolicies.filter(({ id }) => implicitPolicyIds.has(id)).map(({ name }) => name)
      ),
    [knownPolicies, implicitPolicyIds]
  );

  const isRowSelected = useCallback(
    (row: PolicyRow) => (row.members ?? [row]).some(({ id }) => selectedSet.has(id)),
    [selectedSet]
  );
  const isRowShardAssigned = useCallback(
    (row: PolicyRow) =>
      !isRowSelected(row) && (row.members ?? [row]).some(({ id }) => shardKeySet.has(id)),
    [isRowSelected, shardKeySet]
  );

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
      visiblePolicies
        .filter((policy) => !isRowShardAssigned(policy))
        .flatMap((policy) => policy.members ?? [policy]),
    [visiblePolicies, isRowShardAssigned]
  );

  const visibleSelectedCount = useMemo(
    () => visibleAssignable.filter((policy) => selectedSet.has(policy.id)).length,
    [visibleAssignable, selectedSet]
  );

  const totalAgents = useMemo(
    () =>
      reduce(
        Array.from(selectedSet),
        (acc, policyId) => acc + (agentPoliciesById?.[policyId]?.agents ?? 0),
        0
      ),
    [selectedSet, agentPoliciesById]
  );

  const togglePolicy = useCallback(
    (policyId: string) => {
      const row = allPolicies.find(({ id }) => id === policyId);
      if (!row || isRowShardAssigned(row)) return;

      const next = new Set(selectedIds ?? []);
      const members = row.members ?? [row];
      if (isRowSelected(row)) {
        members.forEach(({ id }) => next.delete(id));
      } else {
        members.forEach(({ id }) => next.add(id));
      }

      onChange(Array.from(next));
    },
    [selectedIds, onChange, allPolicies, isRowSelected, isRowShardAssigned]
  );

  // Both bulk actions operate on the rows currently matching the search, so a
  // filtered "Select all" cannot silently assign policies the user cannot see.
  // With no search active the visible set is every row, preserving the
  // unfiltered behaviour (including orphan ids, which are never invented here).
  const handleSelectAll = useCallback(() => {
    const idsToAdd = visiblePolicies
      .filter((policy) => !policy.isOrphan && !isRowShardAssigned(policy))
      .flatMap((policy) => policy.members ?? [policy])
      .map((policy) => policy.id);

    onChange(Array.from(new Set([...(selectedIds ?? []), ...idsToAdd])));
  }, [visiblePolicies, isRowShardAssigned, selectedIds, onChange]);

  const handleUnselectAll = useCallback(() => {
    const visibleIds = new Set(
      visiblePolicies.flatMap((policy) => policy.members ?? [policy]).map((policy) => policy.id)
    );

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

  const renderPolicyLink = useCallback(
    (item: PolicyRow) =>
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
    [canReadFleetPolicies, getUrlForApp]
  );

  const renderPolicyName = useCallback(
    (policy: PolicyRow) => (
      <>
        {policy.name}
        {receivingPolicyIds?.includes(policy.id) && (
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.osquery.pack.form.sharedIntegration.receivesPackLabel"
              defaultMessage="Receives this pack via shared integration"
            />
          </EuiText>
        )}
      </>
    ),
    [receivingPolicyIds]
  );

  // One marker per member. "Included" covers members pulled in by the current
  // selection; "Receives this pack" (from the server) is kept only for a group
  // that gets the pack while none of its members is selected, i.e. Fleet drift.
  // Like Fleet's shared-integration popover, the policy name itself links to
  // the agent policy.
  const renderGroupMember = useCallback(
    (member: PolicyRow) => (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
        <EuiFlexItem grow={false} className="eui-textTruncate">
          {canReadFleetPolicies ? (
            <EuiLink
              href={getUrlForApp(FLEET_PLUGIN_ID, {
                path: pagePathGetters.policy_details({ policyId: member.id })[1],
              })}
              target="_blank"
              data-test-subj={`viewPolicy-${member.id}`}
            >
              {member.name}
            </EuiLink>
          ) : (
            member.name
          )}
        </EuiFlexItem>
        {implicitPolicyIds.has(member.id) ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              <FormattedMessage
                id="xpack.osquery.pack.form.sharedIntegration.includedLabel"
                defaultMessage="Included via shared integration"
              />
            </EuiBadge>
          </EuiFlexItem>
        ) : (
          !selectedSet.has(member.id) &&
          receivingPolicyIds?.includes(member.id) && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                <FormattedMessage
                  id="xpack.osquery.pack.form.sharedIntegration.receivesPackLabel"
                  defaultMessage="Receives this pack via shared integration"
                />
              </EuiBadge>
            </EuiFlexItem>
          )
        )}
        <EuiFlexItem />
        <EuiFlexItem grow={false} className="eui-textNoWrap">
          <AgentCountCell count={member.agents} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [implicitPolicyIds, selectedSet, receivingPolicyIds, canReadFleetPolicies, getUrlForApp]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<PolicyRow>>>(
    () => [
      {
        name: '',
        width: '64px',
        render: (item: PolicyRow) => {
          const isShardAssigned = isRowShardAssigned(item);

          return (
            <CheckboxCell
              policyId={item.id}
              policyName={item.name}
              accessibleName={
                item.members
                  ? i18n.translate('xpack.osquery.pack.form.sharedIntegration.checkboxAriaLabel', {
                      defaultMessage: 'Select shared integration {name}, {count} agent policies',
                      values: { name: item.integrationName, count: item.members.length },
                    })
                  : undefined
              }
              checked={isRowSelected(item)}
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
        render: (name: string, item: PolicyRow) => {
          if (!item.members) return renderPolicyName(item);

          const integrationName = item.integrationName ?? '';

          return (
            <EuiFlexGroup
              role="group"
              aria-label={i18n.translate('xpack.osquery.pack.form.sharedIntegration.badge', {
                defaultMessage: 'Shared integration: {name}',
                values: { name: integrationName },
              })}
              alignItems="center"
              gutterSize="s"
              responsive={false}
              wrap={false}
            >
              <EuiFlexItem grow={false} className="eui-textTruncate">
                {name}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SharedPoliciesPopover
                  integrationName={integrationName}
                  members={item.members}
                  renderMember={renderGroupMember}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('xpack.osquery.pack.form.sharedIntegration.tooltip', {
                    defaultMessage:
                      'These agent policies share the Osquery Manager integration {name}. Packs are delivered per integration, so they are selected together.',
                    values: { name: integrationName },
                  })}
                >
                  <EuiText
                    size="xs"
                    color="subdued"
                    className="eui-textNoWrap"
                    tabIndex={0}
                    data-test-subj="policyAssignmentSharedLabel"
                  >
                    <FormattedMessage
                      id="xpack.osquery.pack.form.sharedIntegration.sharedLabel"
                      defaultMessage="Shared"
                    />{' '}
                    <EuiIcon type="info" aria-hidden={true} />
                  </EuiText>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
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
        // user to a not-found screen. A shared row links its first agent policy,
        // like Fleet's summary line; the popover links every member.
        render: (item: PolicyRow) => renderPolicyLink(item.members?.[0] ?? item),
      },
    ],
    [
      togglePolicy,
      isAssignmentDisabled,
      isRowSelected,
      isRowShardAssigned,
      renderPolicyLink,
      renderPolicyName,
      renderGroupMember,
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
        {implicitPolicyIds.size > 0 && (
          <>
            <KbnInfoCallout
              announceOnMount
              size="s"
              data-test-subj="policyAssignmentSharedIntegrationCallout"
              title={i18n.translate(
                'xpack.osquery.pack.form.sharedIntegration.partialSelectionTitle',
                {
                  defaultMessage: 'Shared integration includes additional agent policies',
                }
              )}
              text={i18n.translate(
                'xpack.osquery.pack.form.sharedIntegration.partialSelectionDescription',
                {
                  defaultMessage:
                    'These agent policies receive this pack because they share an integration with a selected agent policy: {policyNames}. Saving does not add them to this pack’s agent policies.',
                  values: { policyNames: implicitPolicyNames },
                }
              )}
            />
            <EuiSpacer size="s" />
          </>
        )}
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
