/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { LICENSE_FOR_AGENT_MIGRATION } from '../../../../../../../common/constants';
import { useLicense } from '../../../../hooks';
import { ExperimentalFeaturesService } from '../../../../services';
import {
  isAgentEligibleForMigration,
  isAgentEligibleForPrivilegeLevelChange,
  isAgentRequestDiagnosticsSupported,
} from '../../../../../../../common/services';
import { isStuckInUpdating } from '../../../../../../../common/services/agent_status';
import type { Agent, AgentPolicy } from '../../../../types';
import { useLink } from '../../../../hooks';
import { useAuthz } from '../../../../../../hooks/use_authz';
import { isAgentUpgradeable } from '../../../../services';
import { HierarchicalActionsMenu } from '../../components';
import type { MenuItem } from '../../components';

export const TableRowActions: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
  onReassignClick: () => void;
  onUnenrollClick: () => void;
  onGetUninstallCommandClick: () => void;
  onUpgradeClick: () => void;
  onAddRemoveTagsClick: (button: HTMLElement) => void;
  onRequestDiagnosticsClick: () => void;
  onMigrateAgentClick: () => void;
  onChangeAgentPrivilegeLevelClick: () => void;
}> = ({
  agent,
  agentPolicy,
  onReassignClick,
  onUnenrollClick,
  onGetUninstallCommandClick,
  onUpgradeClick,
  onAddRemoveTagsClick,
  onRequestDiagnosticsClick,
  onMigrateAgentClick,
  onChangeAgentPrivilegeLevelClick,
}) => {
  const { getHref } = useLink();
  const authz = useAuthz();
  const licenseService = useLicense();
  const isUnenrolling = agent.status === 'unenrolling';
  const isAgentUpdating = isStuckInUpdating(agent);
  const agentPrivilegeLevelChangeEnabled =
    ExperimentalFeaturesService.get().enableAgentPrivilegeLevelChange;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Build hierarchical menu items
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];

    // View agent - always available
    items.push({
      id: 'view-agent',
      name: (
        <FormattedMessage id="xpack.fleet.agentList.viewActionText" defaultMessage="View agent" />
      ),
      icon: 'inspect',
      onClick: () => {
        window.location.href = getHref('agent_details', { agentId: agent.id });
      },
    });

    // Top-level items (only if has privileges and not managed)
    if (authz.fleet.allAgents && agentPolicy?.is_managed === false) {
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
          disabled: !agent.active || agentPolicy?.supports_agentless === true,
          onClick: () => {
            onReassignClick();
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
            onUpgradeClick();
          },
          'data-test-subj': 'upgradeBtn',
        }
      );
    }

    // Upgrade management submenu (only show if agent is stuck in updating)
    if (authz.fleet.allAgents && isAgentUpdating) {
      items.push({
        id: 'upgrade-management',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentList.upgradeManagement"
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
              onUpgradeClick();
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
          onMigrateAgentClick();
        },
        'data-test-subj': 'migrateAgentMenuItem',
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
          onRequestDiagnosticsClick();
        },
        'data-test-subj': 'requestAgentDiagnosticsBtn',
      });
    }

    if (maintenanceChildren.length > 0) {
      items.push({
        id: 'maintenance',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentList.maintenanceAndDiagnostics"
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
          onChangeAgentPrivilegeLevelClick();
        },
        'data-test-subj': 'changeAgentPrivilegeLevelMenuItem',
      });
    }

    // Unenroll agent
    if (authz.fleet.allAgents && agentPolicy?.is_managed === false) {
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
        disabled: !agent.active || agentPolicy?.supports_agentless === true,
        onClick: () => {
          onUnenrollClick();
        },
        'data-test-subj': 'agentUnenrollBtn',
      });

      // Uninstall agent
      if (authz.fleet.allAgents && agent.policy_id && !agentPolicy?.supports_agentless) {
        securityChildren.push({
          id: 'uninstall',
          name: (
            <FormattedMessage
              id="xpack.fleet.agentList.getUninstallCommand"
              defaultMessage="Uninstall agent"
            />
          ),
          icon: 'minusInCircle',
          disabled: !agent.active,
          onClick: () => {
            onGetUninstallCommandClick();
          },
          'data-test-subj': 'uninstallAgentMenuItem',
        });
      }
    }

    if (securityChildren.length > 0) {
      items.push({
        id: 'security',
        name: (
          <FormattedMessage
            id="xpack.fleet.agentList.securityAndRemoval"
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
    authz.fleet.allAgents,
    authz.fleet.readAgents,
    isAgentUpdating,
    isUnenrolling,
    agentPrivilegeLevelChangeEnabled,
    licenseService,
    getHref,
    onAddRemoveTagsClick,
    onReassignClick,
    onUpgradeClick,
    onMigrateAgentClick,
    onRequestDiagnosticsClick,
    onChangeAgentPrivilegeLevelClick,
    onUnenrollClick,
    onGetUninstallCommandClick,
  ]);

  return (
    <HierarchicalActionsMenu
      items={menuItems}
      isOpen={isMenuOpen}
      onToggle={setIsMenuOpen}
      data-test-subj="agentActionsBtn"
    />
  );
};
