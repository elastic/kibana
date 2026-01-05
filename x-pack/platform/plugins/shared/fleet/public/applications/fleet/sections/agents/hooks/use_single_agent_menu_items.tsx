/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { LICENSE_FOR_AGENT_MIGRATION } from '../../../../../../common/constants';
import {
  isAgentEligibleForMigration,
  isAgentEligibleForPrivilegeLevelChange,
  isAgentRequestDiagnosticsSupported,
  isAgentUpgrading,
} from '../../../../../../common/services';
import { isStuckInUpdating } from '../../../../../../common/services/agent_status';

import type { Agent, AgentPolicy } from '../../../types';
import { useAuthz, useLicense } from '../../../hooks';
import { ExperimentalFeaturesService, isAgentUpgradeable } from '../../../services';

import type { MenuItem } from '../components/hierarchical_actions_menu';

/**
 * Callbacks interface for single-agent menu actions
 */
export interface SingleAgentMenuCallbacks {
  /** Optional - only used in table row to navigate to agent details */
  onViewAgentClick?: () => void;
  onAddRemoveTagsClick: (button: HTMLElement) => void;
  onReassignClick: () => void;
  onUpgradeClick: () => void;
  onViewAgentJsonClick: () => void;
  onMigrateAgentClick: () => void;
  onRequestDiagnosticsClick: () => void;
  onChangeAgentPrivilegeLevelClick: () => void;
  onUnenrollClick: () => void;
  onUninstallClick: () => void;
}

export interface UseSingleAgentMenuItemsOptions {
  agent: Agent;
  agentPolicy?: AgentPolicy;
  callbacks: SingleAgentMenuCallbacks;
}

/**
 * Hook to generate standardized menu items for single-agent actions.
 * Used by both table row actions and agent details page actions menu.
 */
export function useSingleAgentMenuItems({
  agent,
  agentPolicy,
  callbacks,
}: UseSingleAgentMenuItemsOptions): MenuItem[] {
  const authz = useAuthz();
  const licenseService = useLicense();

  const isUnenrolling = agent.status === 'unenrolling';
  const isAgentUpdating = isStuckInUpdating(agent);
  const hasFleetAllPrivileges = authz.fleet.allAgents;
  const agentPrivilegeLevelChangeEnabled =
    ExperimentalFeaturesService.get().enableAgentPrivilegeLevelChange;

  const menuItems = useMemo(() => {
    const items: MenuItem[] = [];

    // View agent - only shown when onViewAgentClick is provided (table row context)
    if (callbacks.onViewAgentClick) {
      items.push({
        id: 'view-agent',
        name: (
          <FormattedMessage id="xpack.fleet.agentList.viewActionText" defaultMessage="View agent" />
        ),
        icon: 'inspect',
        onClick: () => {
          callbacks.onViewAgentClick?.();
        },
      });
    }

    // Top-level (common-use) items (only if has privileges and not managed)
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
          keepMenuOpen: true,
          onClick: (event) => {
            callbacks.onAddRemoveTagsClick((event.target as Element).closest('button')!);
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
            callbacks.onReassignClick();
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
            callbacks.onUpgradeClick();
          },
          'data-test-subj': 'upgradeBtn',
        }
      );
    }

    // Upgrade management submenu - conditionally shown if the user has privileges and the agent is upgradeable or actively upgrading
    if (hasFleetAllPrivileges && (isAgentUpgradeable(agent) || isAgentUpgrading(agent))) {
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
            disabled: !isAgentUpdating,
            onClick: () => {
              callbacks.onUpgradeClick();
            },
            'data-test-subj': 'restartUpgradeBtn',
          },
        ],
      });
    }

    // Maintenance and diagnostics submenu - always shown since View agent JSON is always available
    const maintenanceSubmenu: MenuItem = {
      id: 'maintenance',
      name: (
        <FormattedMessage
          id="xpack.fleet.agentList.maintenanceAndDiagnostics"
          defaultMessage="Maintenance and diagnostics"
        />
      ),
      panelTitle: 'Maintenance and diagnostics',
      children: [
        // View agent JSON - always available
        {
          id: 'view-json',
          name: (
            <FormattedMessage
              id="xpack.fleet.agentList.viewAgentDetailsJsonText"
              defaultMessage="View agent JSON"
            />
          ),
          icon: 'code',
          onClick: () => {
            callbacks.onViewAgentJsonClick();
          },
          'data-test-subj': 'viewAgentDetailsJsonBtn',
        },
      ],
    };

    // Migrate agent - only shown if the user has privileges and the agent is eligible for migration
    if (authz.fleet.allAgents && isAgentEligibleForMigration(agent, agentPolicy)) {
      maintenanceSubmenu.children!.push({
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
          callbacks.onMigrateAgentClick();
        },
        'data-test-subj': 'migrateAgentMenuItem',
      });
    }

    // Request diagnostics
    if (authz.fleet.readAgents) {
      maintenanceSubmenu.children!.push({
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
          callbacks.onRequestDiagnosticsClick();
        },
        'data-test-subj': 'requestAgentDiagnosticsBtn',
      });
    }

    items.push(maintenanceSubmenu);

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
          callbacks.onChangeAgentPrivilegeLevelClick();
        },
        'data-test-subj': 'changeAgentPrivilegeLevelMenuItem',
      });
    }

    // Unenroll and Uninstall agent
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
        iconColor: 'danger',
        disabled: !agent.active || agentPolicy?.supports_agentless === true,
        onClick: () => {
          callbacks.onUnenrollClick();
        },
        'data-test-subj': 'agentUnenrollBtn',
      });

      // Uninstall agent
      if (agent.policy_id && !agentPolicy?.supports_agentless) {
        securityChildren.push({
          id: 'uninstall',
          name: (
            <FormattedMessage
              id="xpack.fleet.agentList.getUninstallCommand"
              defaultMessage="Uninstall agent"
            />
          ),
          icon: 'minusInCircle',
          iconColor: 'danger',
          disabled: !agent.active,
          onClick: () => {
            callbacks.onUninstallClick();
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
    hasFleetAllPrivileges,
    authz.fleet.allAgents,
    authz.fleet.readAgents,
    isAgentUpdating,
    isUnenrolling,
    agentPrivilegeLevelChangeEnabled,
    licenseService,
    callbacks,
  ]);

  return menuItems;
}
