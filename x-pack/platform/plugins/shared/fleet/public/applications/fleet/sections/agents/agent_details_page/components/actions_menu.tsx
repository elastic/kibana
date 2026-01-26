/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import { EuiPortal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent, AgentPolicy } from '../../../../types';
import {
  AgentUnenrollAgentModal,
  AgentReassignAgentPolicyModal,
  AgentUpgradeAgentModal,
  HierarchicalActionsMenu,
} from '../../components';
import { useSingleAgentMenuItems } from '../../hooks/use_single_agent_menu_items';
import type { SingleAgentMenuCallbacks } from '../../hooks/use_single_agent_menu_items';
import { useAgentRefresh } from '../hooks';
import { policyHasFleetServer } from '../../../../services';
import { AgentRequestDiagnosticsModal } from '../../components/agent_request_diagnostics_modal';
import {
  AgentMigrateFlyout,
  ChangeAgentPrivilegeLevelFlyout,
} from '../../agent_list_page/components';
import { UninstallCommandFlyout } from '../../../../components';
import { AgentRollbackModal } from '../../components/agent_rollback_modal';

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
    const refreshAgent = useAgentRefresh();

    // Modal/flyout state
    const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState(assignFlyoutOpenByDefault);
    const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isRequestDiagnosticsModalOpen, setIsRequestDiagnosticsModalOpen] = useState(false);
    const [isAgentDetailsJsonFlyoutOpen, setIsAgentDetailsJsonFlyoutOpen] = useState(false);
    const [isAgentMigrateFlyoutOpen, setIsAgentMigrateFlyoutOpen] = useState(false);
    const [isChangePrivilegeLevelFlyoutOpen, setIsChangePrivilegeLevelFlyoutOpen] = useState(false);
    const [isUninstallCommandFlyoutOpen, setIsUninstallCommandFlyoutOpen] = useState(false);
    const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const onMenuToggle = useCallback((open: boolean) => {
      setIsMenuOpen(open);
    }, []);

    const hasFleetServer = agentPolicy && policyHasFleetServer(agentPolicy);
    const isUnenrolling = agent.status === 'unenrolling';

    const onClose = useMemo(() => {
      if (onCancelReassign) {
        return onCancelReassign;
      } else {
        return () => setIsReassignFlyoutOpen(false);
      }
    }, [onCancelReassign, setIsReassignFlyoutOpen]);

    // Build callbacks for the shared hook
    const callbacks: SingleAgentMenuCallbacks = useMemo(
      () => ({
        // No onViewAgentClick - we're already on agent details page
        onAddRemoveTagsClick,
        onReassignClick: () => setIsReassignFlyoutOpen(true),
        onUpgradeClick: () => setIsUpgradeModalOpen(true),
        onViewAgentJsonClick: () => setIsAgentDetailsJsonFlyoutOpen(true),
        onMigrateAgentClick: () => setIsAgentMigrateFlyoutOpen(true),
        onRequestDiagnosticsClick: () => setIsRequestDiagnosticsModalOpen(true),
        onChangeAgentPrivilegeLevelClick: () => setIsChangePrivilegeLevelFlyoutOpen(true),
        onUnenrollClick: () => setIsUnenrollModalOpen(true),
        onUninstallClick: () => setIsUninstallCommandFlyoutOpen(true),
        onRollbackClick: () => setIsRollbackModalOpen(true),
      }),
      [onAddRemoveTagsClick]
    );

    // Use the shared hook for menu items
    const menuItems = useSingleAgentMenuItems({
      agent,
      agentPolicy,
      callbacks,
    });

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
        {isUninstallCommandFlyoutOpen && agent.policy_id && (
          <EuiPortal>
            <UninstallCommandFlyout
              target="agent"
              policyId={agent.policy_id}
              onClose={() => {
                setIsUninstallCommandFlyoutOpen(false);
              }}
            />
          </EuiPortal>
        )}
        {isRollbackModalOpen && (
          <EuiPortal>
            <AgentRollbackModal
              agents={[agent]}
              agentCount={1}
              onClose={() => setIsRollbackModalOpen(false)}
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
