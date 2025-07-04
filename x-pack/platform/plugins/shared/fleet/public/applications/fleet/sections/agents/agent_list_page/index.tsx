/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { differenceBy, isEqual } from 'lodash';
import { EuiSpacer, EuiPortal } from '@elastic/eui';

import { isStuckInUpdating } from '../../../../../../common/services/agent_status';
import { FLEET_SERVER_PACKAGE } from '../../../../../../common';

import type { Agent } from '../../../types';

import {
  useBreadcrumbs,
  useStartServices,
  useFlyoutContext,
  useFleetServerStandalone,
} from '../../../hooks';
import { AgentEnrollmentFlyout, UninstallCommandFlyout } from '../../../components';
import { policyHasFleetServer } from '../../../services';
import { SO_SEARCH_LIMIT } from '../../../constants';
import {
  AgentReassignAgentPolicyModal,
  AgentUnenrollAgentModal,
  AgentUpgradeAgentModal,
  FleetServerCloudUnhealthyCallout,
  FleetServerMissingEncryptionKeyCallout,
  FleetServerOnPremUnhealthyCallout,
} from '../components';
import { useFleetServerUnhealthy } from '../hooks/use_fleet_server_unhealthy';

import { AgentRequestDiagnosticsModal } from '../components/agent_request_diagnostics_modal';
import { ManageAutoUpgradeAgentsModal } from '../components/manage_auto_upgrade_agents_modal';

import type { SelectionMode } from './components/types';

import {
  AgentListTable,
  AgentSoftLimitCallout,
  AgentTableHeader,
  SearchAndFilterBar,
  TableRowActions,
  TagsAddRemove,
  AgentMigrateFlyout,
} from './components';
import { AgentActivityFlyout } from './components/agent_activity_flyout';
import { useAgentSoftLimit, useMissingEncryptionKeyCallout, useFetchAgentsData } from './hooks';

export const AgentListPage: React.FunctionComponent<{}> = () => {
  const { cloud } = useStartServices();
  useBreadcrumbs('agent_list');

  // Table and search states
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('manual');

  // Agent enrollment flyout state
  const [enrollmentFlyout, setEnrollmentFlyoutState] = useState<{
    isOpen: boolean;
    selectedPolicyId?: string;
  }>({
    isOpen: false,
  });
  const [isAgentActivityFlyoutOpen, setAgentActivityFlyoutOpen] = useState(false);
  const [isManageAutoUpgradeModalOpen, setManageAutoUpgradeModalOpen] = useState(false);

  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>();
  const flyoutContext = useFlyoutContext();

  // Agent actions states
  const [agentToReassign, setAgentToReassign] = useState<Agent | undefined>(undefined);
  const [agentToUnenroll, setAgentToUnenroll] = useState<Agent | undefined>(undefined);
  const [agentToGetUninstallCommand, setAgentToGetUninstallCommand] = useState<Agent | undefined>(
    undefined
  );
  const [agentToUpgrade, setAgentToUpgrade] = useState<Agent | undefined>(undefined);
  const [agentToAddRemoveTags, setAgentToAddRemoveTags] = useState<Agent | undefined>(undefined);
  const [tagsPopoverButton, setTagsPopoverButton] = useState<HTMLElement>();
  const [showTagsAddRemove, setShowTagsAddRemove] = useState(false);
  const [agentToRequestDiagnostics, setAgentToRequestDiagnostics] = useState<Agent | undefined>(
    undefined
  );

  const [showAgentActivityTour, setShowAgentActivityTour] = useState({ isOpen: false });

  // migrateAgentState
  const [agentsToMigrate, setAgentsToMigrate] = useState<Agent[] | undefined>(undefined);
  const [protectedAndFleetAgents, setProtectedAndFleetAgents] = useState<Agent[]>([]);
  const [migrateFlyoutOpen, setMigrateFlyoutOpen] = useState(false);

  const {
    allTags,
    agentsOnCurrentPage,
    agentsStatus,
    isLoading,
    nAgentsInTable,
    totalInactiveAgents,
    totalManagedAgentIds,
    managedAgentsOnCurrentPage,
    showUpgradeable,
    setShowUpgradeable,
    search,
    setSearch,
    selectedAgentPolicies,
    setSelectedAgentPolicies,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    selectedStatus,
    setSelectedStatus,
    selectedTags,
    setSelectedTags,
    allAgentPolicies,
    agentPoliciesRequest,
    agentPoliciesIndexedById,
    pagination,
    pageSizeOptions,
    setPagination,
    kuery,
    draftKuery,
    setDraftKuery,
    fetchData,
    currentRequestRef,
    latestAgentActionErrors,
    setLatestAgentActionErrors,
  } = useFetchAgentsData();

  const onSubmitSearch = useCallback(
    (newKuery: string) => {
      setSearch(newKuery);
      setPagination({
        ...pagination,
        currentPage: 1,
      });
    },
    [setSearch, pagination, setPagination]
  );

  const isUsingFilter = !!(
    search.trim() ||
    selectedAgentPolicies.length ||
    selectedStatus.length ||
    selectedTags.length ||
    showUpgradeable
  );

  const clearFilters = useCallback(() => {
    setDraftKuery('');
    setSearch('');
    setSelectedAgentPolicies([]);
    setSelectedStatus([]);
    setSelectedTags([]);
    setShowUpgradeable(false);
  }, [
    setDraftKuery,
    setSearch,
    setSelectedAgentPolicies,
    setSelectedStatus,
    setSelectedTags,
    setShowUpgradeable,
  ]);

  const onTableChange = ({
    page,
    sort,
  }: {
    page?: { index: number; size: number };
    sort?: { field: keyof Agent; direction: 'asc' | 'desc' };
  }) => {
    const newPagination = {
      ...pagination,
      currentPage: page!.index + 1,
      pageSize: page!.size,
    };
    setPagination(newPagination);
    setSortField(sort!.field);
    setSortOrder(sort!.direction);
  };

  const openMigrateFlyout = (agents: Agent[]) => {
    const protectedAgents = agents.filter(
      (agent) => agentPoliciesIndexedById[agent.policy_id as string]?.is_protected
    );
    const fleetAgents = agents.filter((agent) =>
      agentPoliciesIndexedById[agent.policy_id as string]?.package_policies?.some(
        (p) => p.package?.name === FLEET_SERVER_PACKAGE
      )
    );

    const unallowedAgents = [...protectedAgents, ...fleetAgents];
    setProtectedAndFleetAgents(unallowedAgents);
    setAgentsToMigrate(agents.filter((agent) => !unallowedAgents.some((a) => a.id === agent.id)));
    setMigrateFlyoutOpen(true);
  };

  const renderActions = (agent: Agent) => {
    const agentPolicy =
      typeof agent.policy_id === 'string' ? agentPoliciesIndexedById[agent.policy_id] : undefined;

    // refreshing agent tags passed to TagsAddRemove component
    if (agentToAddRemoveTags?.id === agent.id && !isEqual(agent.tags, agentToAddRemoveTags.tags)) {
      setAgentToAddRemoveTags(agent);
    }
    return (
      <TableRowActions
        agent={agent}
        agentPolicy={agentPolicy}
        onReassignClick={() => setAgentToReassign(agent)}
        onUnenrollClick={() => setAgentToUnenroll(agent)}
        onUpgradeClick={() => setAgentToUpgrade(agent)}
        onAddRemoveTagsClick={(button) => {
          setTagsPopoverButton(button);
          setAgentToAddRemoveTags(agent);
          setShowTagsAddRemove(!showTagsAddRemove);
        }}
        onGetUninstallCommandClick={() => setAgentToGetUninstallCommand(agent)}
        onRequestDiagnosticsClick={() => setAgentToRequestDiagnostics(agent)}
        onMigrateAgentClick={() => openMigrateFlyout([agent])}
      />
    );
  };

  const isAgentSelectable = useCallback(
    (agent: Agent) => {
      if (!agent.active) return false;
      if (!agent.policy_id) return true;
      const agentPolicy = agentPoliciesIndexedById[agent.policy_id];
      const isHosted = agentPolicy?.is_managed === true;
      return !isHosted;
    },
    [agentPoliciesIndexedById]
  );

  const onSelectionChange = (newAgents: Agent[]) => {
    if (selectionMode === 'query' && newAgents.length < selectedAgents.length) {
      // differentiating between selection changed by agents dropping from current page or user action
      const areSelectedAgentsStillVisible =
        selectedAgents.length > 0 &&
        differenceBy(selectedAgents, agentsOnCurrentPage, 'id').length === 0;
      if (!areSelectedAgentsStillVisible) {
        // force selecting all agents on current page if staying in query mode
        return setSelectedAgents(agentsOnCurrentPage.filter((agent) => isAgentSelectable(agent)));
      } else {
        setSelectionMode('manual');
      }
    }
    setSelectedAgents(newAgents);
  };

  const onSelectedStatusChange = (status: string[]) => {
    if (selectionMode === 'query') {
      setSelectionMode('manual');
    }
    setSelectedStatus(status);
  };

  const onSelectedAgentPoliciesChange = (policies: string[]) => {
    if (selectionMode === 'query') {
      setSelectionMode('manual');
    }
    setSelectedAgentPolicies(policies);
  };

  const agentToUnenrollHasFleetServer = useMemo(() => {
    if (!agentToUnenroll || !agentToUnenroll.policy_id) {
      return false;
    }

    const agentPolicy = agentPoliciesIndexedById[agentToUnenroll.policy_id];

    if (!agentPolicy) {
      return false;
    }

    return policyHasFleetServer(agentPolicy);
  }, [agentToUnenroll, agentPoliciesIndexedById]);

  // Missing Encryption key
  const [canShowMissingEncryptionKeyCallout, dismissEncryptionKeyCallout] =
    useMissingEncryptionKeyCallout();

  // Fleet server unhealthy status
  const { isUnhealthy: isFleetServerUnhealthy } = useFleetServerUnhealthy();
  const { isFleetServerStandalone } = useFleetServerStandalone();
  const showUnhealthyCallout = isFleetServerUnhealthy && !isFleetServerStandalone;

  const { shouldDisplayAgentSoftLimit } = useAgentSoftLimit();

  const onClickAddFleetServer = useCallback(() => {
    flyoutContext.openFleetServerFlyout();
  }, [flyoutContext]);

  const onClickAgentActivity = useCallback(() => {
    setAgentActivityFlyoutOpen(true);
    setLatestAgentActionErrors([]);
  }, [setAgentActivityFlyoutOpen, setLatestAgentActionErrors]);

  const refreshAgents = ({ refreshTags = false }: { refreshTags?: boolean } = {}) => {
    fetchData({ refreshTags });
    setShowAgentActivityTour({ isOpen: true });
  };

  const isCurrentRequestIncremented = currentRequestRef?.current === 1;

  return (
    <>
      {isAgentActivityFlyoutOpen ? (
        <EuiPortal>
          <AgentActivityFlyout
            onAbortSuccess={fetchData}
            onClose={() => setAgentActivityFlyoutOpen(false)}
            openManageAutoUpgradeModal={(policyId: string) => {
              setSelectedPolicyId(policyId);

              setManageAutoUpgradeModalOpen(true);
            }}
            refreshAgentActivity={isLoading}
            setSearch={setSearch}
            setSelectedStatus={setSelectedStatus}
          />
        </EuiPortal>
      ) : null}
      {isManageAutoUpgradeModalOpen ? (
        <EuiPortal>
          <ManageAutoUpgradeAgentsModal
            key={selectedPolicyId}
            onClose={() => setManageAutoUpgradeModalOpen(false)}
            agentPolicy={allAgentPolicies.find((p) => p.id === selectedPolicyId)!}
          />
        </EuiPortal>
      ) : null}
      {enrollmentFlyout.isOpen ? (
        <EuiPortal>
          <AgentEnrollmentFlyout
            agentPolicy={allAgentPolicies.find((p) => p.id === enrollmentFlyout.selectedPolicyId)}
            onClose={() => {
              setEnrollmentFlyoutState({ isOpen: false });
              fetchData();
              agentPoliciesRequest.resendRequest();
            }}
          />
        </EuiPortal>
      ) : null}
      {agentToReassign && (
        <EuiPortal>
          <AgentReassignAgentPolicyModal
            agents={[agentToReassign]}
            onClose={() => {
              setAgentToReassign(undefined);
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {agentToUnenroll && (
        <EuiPortal>
          <AgentUnenrollAgentModal
            agents={[agentToUnenroll]}
            agentCount={1}
            onClose={() => {
              setAgentToUnenroll(undefined);
              refreshAgents({ refreshTags: true });
            }}
            useForceUnenroll={agentToUnenroll.status === 'unenrolling'}
            hasFleetServer={agentToUnenrollHasFleetServer}
          />
        </EuiPortal>
      )}
      {agentToGetUninstallCommand?.policy_id && (
        <EuiPortal>
          <UninstallCommandFlyout
            target="agent"
            policyId={agentToGetUninstallCommand.policy_id}
            onClose={() => {
              setAgentToGetUninstallCommand(undefined);
              refreshAgents({ refreshTags: true });
            }}
          />
        </EuiPortal>
      )}
      {agentToUpgrade && (
        <EuiPortal>
          <AgentUpgradeAgentModal
            agents={[agentToUpgrade]}
            agentCount={1}
            onClose={() => {
              setAgentToUpgrade(undefined);
              refreshAgents();
            }}
            isUpdating={isStuckInUpdating(agentToUpgrade)}
          />
        </EuiPortal>
      )}
      {agentToRequestDiagnostics && (
        <EuiPortal>
          <AgentRequestDiagnosticsModal
            agents={[agentToRequestDiagnostics]}
            agentCount={1}
            onClose={() => {
              setAgentToRequestDiagnostics(undefined);
            }}
          />
        </EuiPortal>
      )}
      {showTagsAddRemove && (
        <TagsAddRemove
          agentId={agentToAddRemoveTags?.id!}
          allTags={allTags ?? []}
          selectedTags={agentToAddRemoveTags?.tags ?? []}
          button={tagsPopoverButton!}
          onTagsUpdated={(tagsToAdd: string[]) => {
            refreshAgents({ refreshTags: true });
            // close popover if agent is going to disappear from view to prevent UI error
            if (
              tagsToAdd.length > 0 &&
              (selectedTags[0] === 'No Tags' || kuery.includes('not tags:*'))
            ) {
              setShowTagsAddRemove(false);
            }
          }}
          onClosePopover={() => {
            setShowTagsAddRemove(false);
          }}
        />
      )}
      {migrateFlyoutOpen && (
        <EuiPortal>
          <AgentMigrateFlyout
            agents={agentsToMigrate ?? []}
            protectedAndFleetAgents={protectedAndFleetAgents ?? []}
            onClose={() => {
              setAgentsToMigrate(undefined);
              setProtectedAndFleetAgents([]);
              setMigrateFlyoutOpen(false);
            }}
            onSave={() => {
              setAgentsToMigrate(undefined);
              setProtectedAndFleetAgents([]);
              setMigrateFlyoutOpen(false);
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {showUnhealthyCallout && (
        <>
          {cloud?.deploymentUrl ? (
            <FleetServerCloudUnhealthyCallout deploymentUrl={cloud.deploymentUrl} />
          ) : (
            <FleetServerOnPremUnhealthyCallout onClickAddFleetServer={onClickAddFleetServer} />
          )}
          <EuiSpacer size="l" />
        </>
      )}
      {canShowMissingEncryptionKeyCallout && (
        <>
          <FleetServerMissingEncryptionKeyCallout onClickHandler={dismissEncryptionKeyCallout} />
          <EuiSpacer size="l" />
        </>
      )}
      {shouldDisplayAgentSoftLimit && (
        <>
          <AgentSoftLimitCallout />
          <EuiSpacer size="l" />
        </>
      )}
      {/* Search and filter bar */}
      <SearchAndFilterBar
        agentPolicies={allAgentPolicies}
        draftKuery={draftKuery}
        onDraftKueryChange={setDraftKuery}
        onSubmitSearch={onSubmitSearch}
        selectedAgentPolicies={selectedAgentPolicies}
        onSelectedAgentPoliciesChange={onSelectedAgentPoliciesChange}
        selectedStatus={selectedStatus}
        onSelectedStatusChange={onSelectedStatusChange}
        showUpgradeable={showUpgradeable}
        onShowUpgradeableChange={setShowUpgradeable}
        tags={allTags ?? []}
        selectedTags={selectedTags}
        onSelectedTagsChange={setSelectedTags}
        nAgentsInTable={nAgentsInTable}
        totalInactiveAgents={totalInactiveAgents}
        totalManagedAgentIds={totalManagedAgentIds}
        selectionMode={selectionMode}
        currentQuery={kuery}
        selectedAgents={selectedAgents}
        refreshAgents={refreshAgents}
        onClickAddAgent={() => setEnrollmentFlyoutState({ isOpen: true })}
        onClickAddFleetServer={onClickAddFleetServer}
        agentsOnCurrentPage={agentsOnCurrentPage}
        onClickAgentActivity={onClickAgentActivity}
        showAgentActivityTour={showAgentActivityTour}
        latestAgentActionErrors={latestAgentActionErrors.length}
        sortField={sortField}
        sortOrder={sortOrder}
        onBulkMigrateClicked={(agents: Agent[]) => openMigrateFlyout(agents)}
      />
      <EuiSpacer size="m" />
      {/* Agent total, bulk actions and status bar */}
      <AgentTableHeader
        totalAgents={nAgentsInTable}
        totalManagedAgents={totalManagedAgentIds.length || 0}
        agentStatus={agentsStatus}
        selectableAgents={agentsOnCurrentPage?.filter(isAgentSelectable).length || 0}
        managedAgentsOnCurrentPage={managedAgentsOnCurrentPage}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        selectedAgents={selectedAgents}
        setSelectedAgents={(newAgents: Agent[]) => {
          setSelectedAgents(newAgents);
          setSelectionMode('manual');
        }}
        clearFilters={clearFilters}
        isUsingFilter={isUsingFilter}
      />
      <EuiSpacer size="s" />
      {/* Agent list table */}
      <AgentListTable
        agents={agentsOnCurrentPage}
        sortField={sortField}
        pageSizeOptions={pageSizeOptions}
        sortOrder={sortOrder}
        isLoading={isLoading}
        agentPoliciesIndexedById={agentPoliciesIndexedById}
        renderActions={renderActions}
        onSelectionChange={onSelectionChange}
        selected={selectedAgents}
        showUpgradeable={showUpgradeable}
        onTableChange={onTableChange}
        pagination={pagination}
        totalAgents={Math.min(nAgentsInTable, SO_SEARCH_LIMIT)}
        isUsingFilter={isUsingFilter}
        setEnrollmentFlyoutState={setEnrollmentFlyoutState}
        clearFilters={clearFilters}
        isCurrentRequestIncremented={isCurrentRequestIncremented}
      />
    </>
  );
};
