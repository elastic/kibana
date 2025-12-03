/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import { EuiPortal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { LICENSE_FOR_AGENT_MIGRATION } from '../../../../../../../common/constants';
import {
  isAgentEligibleForMigration,
  isAgentEligibleForPrivilegeLevelChange,
  isAgentRequestDiagnosticsSupported,
} from '../../../../../../../common/services';
import { isStuckInUpdating } from '../../../../../../../common/services/agent_status';

import type { Agent, AgentPolicy } from '../../../../types';
import { useAuthz, useLicense } from '../../../../hooks';
import {
  AgentUnenrollAgentModal,
  AgentReassignAgentPolicyModal,
  AgentUpgradeAgentModal,
  HierarchicalActionsMenu,
} from '../../components';
import type { MenuItem } from '../../components';
import { useAgentRefresh } from '../hooks';
import { ExperimentalFeaturesService } from '../../../../services';
import { isAgentUpgradeable, policyHasFleetServer } from '../../../../services';
import { AgentRequestDiagnosticsModal } from '../../components/agent_request_diagnostics_modal';
import {
  AgentMigrateFlyout,
  ChangeAgentPrivilegeLevelFlyout,
} from '../../agent_list_page/components';

import { AgentDetailsJsonFlyout } from './agent_details_json_flyout';

export const AgentDetailsActionMenu: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
  assignFlyoutOpenByDefault?: boolean;
  onCancelReassign?: () => void;
  onAddRemoveTagsClick: (button: HTMLElement) => void;
}> = memo(
  ({
    agent,
    assignFlyoutOpenByDefault = false,
    onCancelReassign,
    agentPolicy,
    onAddRemoveTagsClick,
  }) => {
    const authz = useAuthz();
    const licenseService = useLicense();
    const hasFleetAllPrivileges = authz.fleet.allAgents;
    const refreshAgent = useAgentRefresh();

    const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState(assignFlyoutOpenByDefault);
    const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isRequestDiagnosticsModalOpen, setIsRequestDiagnosticsModalOpen] = useState(false);
    const [isAgentDetailsJsonFlyoutOpen, setIsAgentDetailsJsonFlyoutOpen] = useState(false);
    const [isAgentMigrateFlyoutOpen, setIsAgentMigrateFlyoutOpen] = useState(false);
    const [isChangePrivilegeLevelFlyoutOpen, setIsChangePrivilegeLevelFlyoutOpen] = useState(false);
    const isUnenrolling = agent.status === 'unenrolling';
    const isAgentUpdating = isStuckInUpdating(agent);
    const agentPrivilegeLevelChangeEnabled =
      ExperimentalFeaturesService.get().enableAgentPrivilegeLevelChange;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const onMenuToggle = useCallback((open: boolean) => {
      setIsMenuOpen(open);
    }, []);

    const hasFleetServer = agentPolicy && policyHasFleetServer(agentPolicy);

    const onClose = useMemo(() => {
      if (onCancelReassign) {
        return onCancelReassign;
      } else {
        return () => setIsReassignFlyoutOpen(false);
      }
    }, [onCancelReassign, setIsReassignFlyoutOpen]);

    // Build hierarchical menu items
    const menuItems: MenuItem[] = useMemo(() => {
      const items: MenuItem[] = [];

      // Top-level items (only if has privileges and not managed)
      if (hasFleetAllPrivileges && !agentPolicy?.is_managed) {
        items.push(
          {
            id: 'tags',
            name: (
              <FormattedMessage
                id="xpack.fleet.agentList.addRemoveTagsActionText"
                defaultMessage="Add / remove tags"
              />
            ),
            icon: 'tag',
            disabled: !agent.active,
            onClick: (event) => {
              onAddRemoveTagsClick((event.target as Element).closest('button')!);
            },
          },
          {
            id: 'reassign',
            name: (
              <FormattedMessage
                id="xpack.fleet.agentList.reassignActionText"
                defaultMessage="Assign to new policy"
              />
            ),
            icon: 'pencil',
            disabled: (!agent.active && !agentPolicy) || agentPolicy?.supports_agentless === true,
            onClick: () => {
              setIsReassignFlyoutOpen(true);
            },
          },
          {
            id: 'upgrade',
            name: (
              <FormattedMessage
                id="xpack.fleet.agentList.upgradeOneButton"
                defaultMessage="Upgrade agent"
              />
            ),
            icon: 'refresh',
            disabled: !isAgentUpgradeable(agent) || agentPolicy?.supports_agentless === true,
            onClick: () => {
              setIsUpgradeModalOpen(true);
            },
            'data-test-subj': 'upgradeBtn',
          }
        );
      }

      // View agent JSON - always available
      items.push({
        id: 'view-json',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentList.viewAgentDetailsJsonText"
            defaultMessage="View agent JSON"
          />
        ),
        icon: 'inspect',
        onClick: () => {
          setIsAgentDetailsJsonFlyoutOpen(!isAgentDetailsJsonFlyoutOpen);
        },
        'data-test-subj': 'viewAgentDetailsJsonBtn',
      });

      // Upgrade management submenu (only show if agent is stuck in updating)
      if (hasFleetAllPrivileges && isAgentUpdating) {
        items.push({
          id: 'upgrade-management',
          name: (
            <FormattedMessage
              id="xpack.fleet.agentDetails.upgradeManagement"
              defaultMessage="Upgrade management"
            />
          ),
          panelTitle: 'Upgrade management',
          children: [
            {
              id: 'restart-upgrade',
              name: (
                <FormattedMessage
                  id="xpack.fleet.agentList.restartUpgradeOneButton"
                  defaultMessage="Restart upgrade"
                />
              ),
              icon: 'refresh',
              onClick: () => {
                setIsUpgradeModalOpen(true);
              },
              'data-test-subj': 'restartUpgradeBtn',
            },
          ],
        });
      }

      // Maintenance and diagnostics submenu
      const maintenanceChildren: MenuItem[] = [];

      // Migrate agent
      if (authz.fleet.allAgents && isAgentEligibleForMigration(agent, agentPolicy)) {
        maintenanceChildren.push({
          id: 'migrate',
          name: (
            <FormattedMessage
              id="xpack.fleet.agentList.migrateAgentActionText"
              defaultMessage="Migrate agent"
            />
          ),
          icon: 'cluster',
          disabled: !agent.active || !licenseService.hasAtLeast(LICENSE_FOR_AGENT_MIGRATION),
          onClick: () => {
            setIsAgentMigrateFlyoutOpen(!isAgentMigrateFlyoutOpen);
          },
          'data-test-subj': 'migrateAgentBtn',
        });
      }

      // Request diagnostics
      if (authz.fleet.readAgents) {
        maintenanceChildren.push({
          id: 'diagnostics',
          name: (
            <FormattedMessage
              id="xpack.fleet.agentList.diagnosticsOneButton"
              defaultMessage="Request diagnostics .zip"
            />
          ),
          icon: 'download',
          disabled: !isAgentRequestDiagnosticsSupported(agent),
          onClick: () => {
            setIsRequestDiagnosticsModalOpen(true);
          },
          'data-test-subj': 'requestAgentDiagnosticsBtn',
        });
      }

      if (maintenanceChildren.length > 0) {
        items.push({
          id: 'maintenance',
          name: (
            <FormattedMessage
              id="xpack.fleet.agentDetails.maintenanceAndDiagnostics"
              defaultMessage="Maintenance and diagnostics"
            />
          ),
          panelTitle: 'Maintenance and diagnostics',
          children: maintenanceChildren,
        });
      }

      // Security and removal submenu
      const securityChildren: MenuItem[] = [];

      // Remove root privilege
      if (
        authz.fleet.allAgents &&
        isAgentEligibleForPrivilegeLevelChange(agent, agentPolicy) &&
        agentPrivilegeLevelChangeEnabled
      ) {
        securityChildren.push({
          id: 'remove-root',
          name: (
            <FormattedMessage
              id="xpack.fleet.agentList.changeAgentPrivilegeLevelActionText"
              defaultMessage="Remove root privilege"
            />
          ),
          icon: 'lock',
          disabled: !agent.active,
          onClick: () => {
            setIsChangePrivilegeLevelFlyoutOpen(!isChangePrivilegeLevelFlyoutOpen);
          },
          'data-test-subj': 'changeAgentPrivilegeLevelBtn',
        });
      }

      // Unenroll agent
      if (hasFleetAllPrivileges && !agentPolicy?.is_managed) {
        securityChildren.push({
          id: 'unenroll',
          name: isUnenrolling ? (
            <FormattedMessage
              id="xpack.fleet.agentList.forceUnenrollOneButton"
              defaultMessage="Force unenroll"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.agentList.unenrollOneButton"
              defaultMessage="Unenroll agent"
            />
          ),
          icon: 'trash',
          disabled:
            !hasFleetAllPrivileges || !agent.active || agentPolicy?.supports_agentless === true,
          onClick: () => {
            setIsUnenrollModalOpen(true);
          },
        });
      }

      if (securityChildren.length > 0) {
        items.push({
          id: 'security',
          name: (
            <FormattedMessage
              id="xpack.fleet.agentDetails.securityAndRemoval"
              defaultMessage="Security and removal"
            />
          ),
          panelTitle: 'Security and removal',
          children: securityChildren,
        });
      }

      return items;
    }, [
      agent,
      agentPolicy,
      hasFleetAllPrivileges,
      authz.fleet.allAgents,
      authz.fleet.readAgents,
      isAgentUpdating,
      isUnenrolling,
      agentPrivilegeLevelChangeEnabled,
      licenseService,
      onAddRemoveTagsClick,
      isAgentDetailsJsonFlyoutOpen,
      isAgentMigrateFlyoutOpen,
      isChangePrivilegeLevelFlyoutOpen,
    ]);

    return (
      <>
        {isReassignFlyoutOpen && (
          <EuiPortal>
            <AgentReassignAgentPolicyModal agents={[agent]} onClose={onClose} />
          </EuiPortal>
        )}
        {isUnenrollModalOpen && (
          <EuiPortal>
            <AgentUnenrollAgentModal
              agents={[agent]}
              agentCount={1}
              onClose={() => {
                setIsUnenrollModalOpen(false);
                refreshAgent();
              }}
              useForceUnenroll={isUnenrolling}
              hasFleetServer={hasFleetServer}
            />
          </EuiPortal>
        )}
        {isUpgradeModalOpen && (
          <EuiPortal>
            <AgentUpgradeAgentModal
              agents={[agent]}
              agentCount={1}
              onClose={() => {
                setIsUpgradeModalOpen(false);
                refreshAgent();
              }}
              isUpdating={isAgentUpdating}
            />
          </EuiPortal>
        )}
        {isRequestDiagnosticsModalOpen && (
          <EuiPortal>
            <AgentRequestDiagnosticsModal
              agents={[agent]}
              agentCount={1}
              onClose={() => {
                setIsRequestDiagnosticsModalOpen(false);
              }}
            />
          </EuiPortal>
        )}
        {isAgentDetailsJsonFlyoutOpen && (
          <EuiPortal>
            <AgentDetailsJsonFlyout
              agent={agent}
              onClose={() => setIsAgentDetailsJsonFlyoutOpen(false)}
            />
          </EuiPortal>
        )}
        {isAgentMigrateFlyoutOpen && (
          <EuiPortal>
            <AgentMigrateFlyout
              agents={[agent]}
              agentCount={1}
              unsupportedMigrateAgents={[]}
              onClose={() => {
                setIsAgentMigrateFlyoutOpen(false);
              }}
              onSave={() => {
                setIsAgentMigrateFlyoutOpen(false);
              }}
            />
          </EuiPortal>
        )}
        {isChangePrivilegeLevelFlyoutOpen && (
          <EuiPortal>
            <ChangeAgentPrivilegeLevelFlyout
              agents={[agent]}
              agentCount={1}
              unsupportedAgents={[]}
              onClose={() => {
                setIsChangePrivilegeLevelFlyoutOpen(false);
              }}
              onSave={() => {
                setIsChangePrivilegeLevelFlyoutOpen(false);
              }}
            />
          </EuiPortal>
        )}
        <HierarchicalActionsMenu
          items={menuItems}
          isOpen={isMenuOpen}
          onToggle={onMenuToggle}
          anchorPosition="downLeft"
          button={{
            props: {
              iconType: 'arrowDown',
              iconSide: 'right',
              color: 'primary',
            },
            children: (
              <FormattedMessage
                id="xpack.fleet.agentDetails.actionsButton"
                defaultMessage="Actions"
              />
            ),
          }}
          data-test-subj="agentActionsBtn"
        />
      </>
    );
  }
);
