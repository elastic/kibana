/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPortal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { ExperimentalFeaturesService } from '../../../../services';
import type { Agent, AgentPolicy } from '../../../../types';
import {
  AgentReassignAgentPolicyModal,
  AgentUnenrollAgentModal,
  AgentUpgradeAgentModal,
  HierarchicalActionsMenu,
} from '../../components';
import type { MenuItem } from '../../components';
import { useAuthz, useLicense, useStartServices } from '../../../../hooks';
import {
  LICENSE_FOR_SCHEDULE_UPGRADE,
  AGENTS_PREFIX,
  LICENSE_FOR_AGENT_MIGRATION,
  LICENSE_FOR_AGENT_ROLLBACK,
} from '../../../../../../../common/constants';
import { getCommonTags } from '../utils';
import { AgentRequestDiagnosticsModal } from '../../components/agent_request_diagnostics_modal';
import { useExportCSV } from '../hooks/export_csv';
import { AgentExportCSVModal } from '../../components/agent_export_csv_modal';
import { AgentRollbackModal } from '../../components/agent_rollback_modal';

import type { SelectionMode } from './types';
import { TagsAddRemove } from './tags_add_remove';
import { AgentMigrateFlyout } from './migrate_agent_flyout';
import { ChangeAgentPrivilegeLevelFlyout } from './change_agent_privilege_level_flyout';

export interface Props {
  nAgentsInTable: number;
  totalManagedAgentIds: string[];
  selectionMode: SelectionMode;
  currentQuery: string;
  selectedAgents: Agent[];
  agentsOnCurrentPage: Agent[];
  refreshAgents: (args?: { refreshTags?: boolean }) => void;
  allTags: string[];
  agentPolicies: AgentPolicy[];
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  unsupportedMigrateAgents: Agent[];
  unsupportedPrivilegeLevelChangeAgents: Agent[];
}

export const AgentBulkActions: React.FunctionComponent<Props> = ({
  nAgentsInTable,
  totalManagedAgentIds,
  selectionMode,
  currentQuery,
  selectedAgents,
  agentsOnCurrentPage,
  refreshAgents,
  allTags,
  agentPolicies,
  sortField,
  sortOrder,
  unsupportedMigrateAgents,
  unsupportedPrivilegeLevelChangeAgents,
}) => {
  const licenseService = useLicense();
  const authz = useAuthz();
  const { reporting } = useStartServices();
  const isLicenceAllowingScheduleUpgrade = licenseService.hasAtLeast(LICENSE_FOR_SCHEDULE_UPGRADE);
  const doesLicenseAllowMigration = licenseService.hasAtLeast(LICENSE_FOR_AGENT_MIGRATION);
  const doesLicenseAllowRollback = licenseService.hasAtLeast(LICENSE_FOR_AGENT_ROLLBACK);
  const agentPrivilegeLevelChangeEnabled =
    ExperimentalFeaturesService.get().enableAgentPrivilegeLevelChange;
  const agentRollbackEnabled = ExperimentalFeaturesService.get().enableAgentRollback;

  // Bulk actions menu states
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Actions states
  const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState<boolean>(false);
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState<boolean>(false);
  const [upgradeModalState, setUpgradeModalState] = useState({
    isOpen: false,
    isScheduled: false,
    isUpdating: false,
  });
  const [isTagAddVisible, setIsTagAddVisible] = useState<boolean>(false);
  const [isRequestDiagnosticsModalOpen, setIsRequestDiagnosticsModalOpen] =
    useState<boolean>(false);
  const [isExportCSVModalOpen, setIsExportCSVModalOpen] = useState<boolean>(false);
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState<boolean>(false);
  const [isAgentPrivilegeChangeModalOpen, setIsAgentPrivilegeChangeModalOpen] =
    useState<boolean>(false);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState<boolean>(false);

  // update the query removing the "managed" agents in any state (unenrolled, offline, etc)
  const selectionQuery = useMemo(() => {
    if (totalManagedAgentIds.length) {
      const excludedKuery = `${AGENTS_PREFIX}.agent.id : (${totalManagedAgentIds
        .map((id) => `"${id}"`)
        .join(' or ')})`;
      return `(${currentQuery}) AND NOT (${excludedKuery})`;
    } else {
      return currentQuery;
    }
  }, [currentQuery, totalManagedAgentIds]);

  const agents = selectionMode === 'manual' ? selectedAgents : selectionQuery;
  const agentCount =
    selectionMode === 'manual'
      ? selectedAgents.length
      : nAgentsInTable - totalManagedAgentIds?.length;

  const [tagsPopoverButton, setTagsPopoverButton] = useState<HTMLElement>();

  const generateReportingJobCSV = useExportCSV();

  const maintainanceItems: MenuItem[] = useMemo(() => {
    return [
      {
        id: 'migrate',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentBulkActions.bulkMigrateAgents"
            defaultMessage="Migrate {agentCount, plural, one {# agent} other {# agents}}"
            values={{ agentCount }}
          />
        ),
        icon: 'cluster',
        disabled: !authz.fleet.allAgents || !doesLicenseAllowMigration,
        onClick: () => {
          setIsMigrateModalOpen(true);
        },
        'data-test-subj': 'agentBulkActionsBulkMigrate',
      },
      {
        id: 'diagnostics',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentBulkActions.requestDiagnostics"
            defaultMessage="Request diagnostics for {agentCount, plural, one {# agent} other {# agents}}"
            values={{ agentCount }}
          />
        ),
        icon: 'download',
        disabled: !authz.fleet.readAgents,
        onClick: () => {
          setIsRequestDiagnosticsModalOpen(true);
        },
        'data-test-subj': 'agentBulkActionsRequestDiagnostics',
      },
      {
        id: 'export',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentBulkActions.exportAgents"
            defaultMessage="Export {agentCount, plural, one {# agent} other {# agents}} as CSV"
            values={{ agentCount }}
          />
        ),
        icon: 'exportAction',
        disabled: !authz.fleet.generateAgentReports || !reporting,
        onClick: () => {
          setIsExportCSVModalOpen(true);
        },
        'data-test-subj': 'bulkAgentExportBtn',
      },
    ];
  }, [
    agentCount,
    authz.fleet.allAgents,
    authz.fleet.readAgents,
    authz.fleet.generateAgentReports,
    doesLicenseAllowMigration,
    reporting,
  ]);

  // Build hierarchical menu items
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      // Top-level items
      {
        id: 'tags',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentBulkActions.addRemoveTags"
            defaultMessage="Add / remove tags"
          />
        ),
        icon: 'tag',
        disabled: !authz.fleet.allAgents,
        keepMenuOpen: true,
        onClick: (event) => {
          setTagsPopoverButton((event.target as Element).closest('button')!);
          setIsTagAddVisible(!isTagAddVisible);
        },
        'data-test-subj': 'agentBulkActionsAddRemoveTags',
      },
      {
        id: 'reassign',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentBulkActions.reassignPolicy"
            defaultMessage="Assign to new policy"
          />
        ),
        icon: 'pencil',
        disabled: !authz.fleet.allAgents,
        onClick: () => {
          setIsReassignFlyoutOpen(true);
        },
        'data-test-subj': 'agentBulkActionsReassign',
      },
      {
        id: 'upgrade',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentBulkActions.upgradeAgents"
            defaultMessage="Upgrade {agentCount, plural, one {# agent} other {# agents}}"
            values={{ agentCount }}
          />
        ),
        icon: 'refresh',
        disabled: !authz.fleet.allAgents,
        onClick: () => {
          setUpgradeModalState({ isOpen: true, isScheduled: false, isUpdating: false });
        },
        'data-test-subj': 'agentBulkActionsUpgrade',
      },
      // Upgrade management submenu
      {
        id: 'upgrade-management',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentBulkActions.upgradeManagement"
            defaultMessage="Upgrade management"
          />
        ),
        panelTitle: 'Upgrade management',
        children: [
          {
            id: 'schedule-upgrade',
            name: (
              <FormattedMessage
                id="xpack.fleet.agentBulkActions.scheduleUpgradeAgents"
                defaultMessage="Schedule upgrade for {agentCount, plural, one {# agent} other {# agents}}"
                values={{ agentCount }}
              />
            ),
            icon: 'timeRefresh',
            disabled: !authz.fleet.allAgents || !isLicenceAllowingScheduleUpgrade,
            onClick: () => {
              setUpgradeModalState({ isOpen: true, isScheduled: true, isUpdating: false });
            },
            'data-test-subj': 'agentBulkActionsScheduleUpgrade',
          },
          {
            id: 'restart-upgrade',
            name: (
              <FormattedMessage
                id="xpack.fleet.agentBulkActions.restartUpgradeAgents"
                defaultMessage="Restart upgrade for {agentCount, plural, one {# agent} other {# agents}}"
                values={{ agentCount }}
              />
            ),
            icon: 'refresh',
            disabled: !authz.fleet.allAgents,
            onClick: () => {
              setUpgradeModalState({ isOpen: true, isScheduled: false, isUpdating: true });
            },
            'data-test-subj': 'agentBulkActionsRestartUpgrade',
          },
          ...(agentRollbackEnabled
            ? [
                {
                  id: 'rollback-upgrade',
                  name: (
                    <FormattedMessage
                      id="xpack.fleet.agentBulkActions.rollbackUpgradeAgents"
                      defaultMessage="Roll back upgrade for {agentCount, plural, one {# agent} other {# agents}}"
                      values={{ agentCount }}
                    />
                  ),
                  icon: 'clockCounter',
                  disabled: !authz.fleet.allAgents || !doesLicenseAllowRollback,
                  onClick: () => {
                    setIsRollbackModalOpen(true);
                  },
                  'data-test-subj': 'agentBulkActionsRollbackUpgrade',
                },
              ]
            : []),
        ],
      },
      // Maintenance and diagnostics submenu
      {
        id: 'maintenance',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentBulkActions.maintenanceAndDiagnostics"
            defaultMessage="Maintenance and diagnostics"
          />
        ),
        panelTitle: 'Maintenance and diagnostics',
        children: maintainanceItems,
      },
      // Security and removal submenu
      {
        id: 'security',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentBulkActions.securityAndRemoval"
            defaultMessage="Security and removal"
          />
        ),
        panelTitle: 'Security and removal',
        children: [
          ...(agentPrivilegeLevelChangeEnabled
            ? [
                {
                  id: 'remove-root',
                  name: (
                    <FormattedMessage
                      id="xpack.fleet.agentBulkActions.bulkChangeAgentsPrivilegeLevel"
                      defaultMessage="Remove root privilege for {agentCount, plural, one {# agent} other {# agents}}"
                      values={{ agentCount }}
                    />
                  ),
                  icon: 'lock' as const,
                  disabled: !authz.fleet.allAgents,
                  onClick: () => {
                    setIsAgentPrivilegeChangeModalOpen(true);
                  },
                  'data-test-subj': 'agentBulkActionsBulkChangeAgentsPrivilegeLevel',
                },
              ]
            : []),
          {
            id: 'unenroll',
            name: (
              <FormattedMessage
                id="xpack.fleet.agentBulkActions.unenrollAgents"
                defaultMessage="Unenroll {agentCount, plural, one {# agent} other {# agents}}"
                values={{ agentCount }}
              />
            ),
            icon: 'trash',
            iconColor: 'danger',
            disabled: !authz.fleet.allAgents,
            onClick: () => {
              setIsUnenrollModalOpen(true);
            },
            'data-test-subj': 'agentBulkActionsUnenroll',
          },
        ],
      },
    ];

    return items;
  }, [
    authz.fleet.allAgents,
    agentCount,
    isLicenceAllowingScheduleUpgrade,
    agentRollbackEnabled,
    doesLicenseAllowRollback,
    maintainanceItems,
    agentPrivilegeLevelChangeEnabled,
    isTagAddVisible,
  ]);

  const getSelectedTagsFromAgents = useMemo(
    () => getCommonTags(agents, agentsOnCurrentPage ?? [], agentPolicies),
    [agents, agentsOnCurrentPage, agentPolicies]
  );

  return (
    <>
      {isReassignFlyoutOpen && (
        <EuiPortal>
          <AgentReassignAgentPolicyModal
            agents={agents}
            onClose={() => {
              setIsReassignFlyoutOpen(false);
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {isUnenrollModalOpen && (
        <EuiPortal>
          <AgentUnenrollAgentModal
            agents={agents}
            agentCount={agentCount}
            onClose={() => {
              setIsUnenrollModalOpen(false);
              refreshAgents({ refreshTags: true });
            }}
          />
        </EuiPortal>
      )}
      {isExportCSVModalOpen && (
        <EuiPortal>
          <AgentExportCSVModal
            onSubmit={(columns: Array<{ field: string }>) => {
              generateReportingJobCSV(agents, columns, {
                field: sortField,
                direction: sortOrder,
              });
              setIsExportCSVModalOpen(false);
            }}
            onClose={() => {
              setIsExportCSVModalOpen(false);
            }}
            agentCount={agentCount}
          />
        </EuiPortal>
      )}
      {upgradeModalState.isOpen && (
        <EuiPortal>
          <AgentUpgradeAgentModal
            agents={agents}
            agentCount={agentCount}
            isScheduled={upgradeModalState.isScheduled}
            isUpdating={upgradeModalState.isUpdating}
            onClose={() => {
              setUpgradeModalState({ isOpen: false, isScheduled: false, isUpdating: false });
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {isTagAddVisible && (
        <TagsAddRemove
          agents={Array.isArray(agents) ? agents.map((agent) => agent.id) : agents}
          allTags={allTags ?? []}
          selectedTags={getSelectedTagsFromAgents}
          button={tagsPopoverButton!}
          onTagsUpdated={() => {
            refreshAgents({ refreshTags: true });
          }}
          onClosePopover={() => {
            setIsTagAddVisible(false);
            setIsMenuOpen(false);
          }}
        />
      )}
      {isRequestDiagnosticsModalOpen && (
        <EuiPortal>
          <AgentRequestDiagnosticsModal
            agents={agents}
            agentCount={agentCount}
            onClose={() => {
              setIsRequestDiagnosticsModalOpen(false);
            }}
          />
        </EuiPortal>
      )}
      {isMigrateModalOpen && (
        <EuiPortal>
          <AgentMigrateFlyout
            agents={agents}
            agentCount={agentCount}
            unsupportedMigrateAgents={unsupportedMigrateAgents}
            onClose={() => {
              setIsMigrateModalOpen(false);
            }}
            onSave={() => {
              setIsMigrateModalOpen(false);
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {isAgentPrivilegeChangeModalOpen && (
        <EuiPortal>
          <ChangeAgentPrivilegeLevelFlyout
            agents={agents}
            agentCount={agentCount}
            unsupportedAgents={unsupportedPrivilegeLevelChangeAgents}
            onClose={() => {
              setIsAgentPrivilegeChangeModalOpen(false);
            }}
            onSave={() => {
              setIsAgentPrivilegeChangeModalOpen(false);
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {isRollbackModalOpen && (
        <EuiPortal>
          <AgentRollbackModal
            agents={agents}
            agentCount={agentCount}
            onClose={() => {
              setIsRollbackModalOpen(false);
            }}
          />
        </EuiPortal>
      )}
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <HierarchicalActionsMenu
            items={menuItems}
            isOpen={isMenuOpen}
            anchorPosition="downLeft"
            onToggle={setIsMenuOpen}
            button={{
              props: {
                iconType: 'arrowDown',
                iconSide: 'right',
                fill: true,
              },
              children: (
                <FormattedMessage
                  id="xpack.fleet.agentBulkActions.actions"
                  defaultMessage="Actions"
                />
              ),
            }}
            data-test-subj="agentBulkActionsButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
