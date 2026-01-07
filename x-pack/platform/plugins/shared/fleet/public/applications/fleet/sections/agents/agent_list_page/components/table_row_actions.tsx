/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';

import type { Agent, AgentPolicy } from '../../../../types';
import { useLink } from '../../../../hooks';
import { HierarchicalActionsMenu } from '../../components';
import { useSingleAgentMenuItems } from '../../hooks/use_single_agent_menu_items';
import type { SingleAgentMenuCallbacks } from '../../hooks/use_single_agent_menu_items';

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
  onViewAgentJsonClick: () => void;
  onRollbackClick: () => void;
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
  onViewAgentJsonClick,
  onRollbackClick,
}) => {
  const { getHref } = useLink();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Build callbacks object for the hook
  const callbacks: SingleAgentMenuCallbacks = useMemo(
    () => ({
      onViewAgentClick: () => {
        window.location.href = getHref('agent_details', { agentId: agent.id });
      },
      onAddRemoveTagsClick,
      onReassignClick,
      onUpgradeClick,
      onViewAgentJsonClick,
      onMigrateAgentClick,
      onRequestDiagnosticsClick,
      onChangeAgentPrivilegeLevelClick,
      onUnenrollClick,
      onUninstallClick: onGetUninstallCommandClick,
      onRollbackClick,
    }),
    [
      agent.id,
      getHref,
      onAddRemoveTagsClick,
      onReassignClick,
      onUpgradeClick,
      onViewAgentJsonClick,
      onMigrateAgentClick,
      onRequestDiagnosticsClick,
      onChangeAgentPrivilegeLevelClick,
      onUnenrollClick,
      onGetUninstallCommandClick,
      onRollbackClick,
    ]
  );

  const menuItems = useSingleAgentMenuItems({
    agent,
    agentPolicy,
    callbacks,
  });

  return (
    <HierarchicalActionsMenu
      items={menuItems}
      isOpen={isMenuOpen}
      onToggle={setIsMenuOpen}
      data-test-subj="agentActionsBtn"
    />
  );
};
