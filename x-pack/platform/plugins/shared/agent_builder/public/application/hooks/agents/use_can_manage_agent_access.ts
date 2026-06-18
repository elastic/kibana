/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { agentBuilderDefaultAgentId, canCurrentUserEditAgent } from '@kbn/agent-builder-common';
import { useUiPrivileges } from '../use_ui_privileges';
import { useCurrentUser } from './use_current_user';

/**
 * Returns whether the current user is allowed to view and edit an agent's access control list.
 *
 * ACL editing is bundled into write access on the agent — if you can edit the agent, you
 * can edit its ACL. That covers the agent owner, cluster admins, anyone the ACL grants
 * Editor or higher, and (on Public agents) anyone holding the `manageAgents` sub-feature
 * privilege via the access control mode baseline.
 *
 * The default agent is excluded entirely — it is system-owned, always Public, and must
 * remain reachable for everyone in the workspace, so ACLs on it are not supported.
 *
 * Returns `false` while the current user is still loading to avoid flashing incorrect actions.
 */
export const useCanManageAgentAccess = (
  agent: AgentDefinition | null | undefined
): { canManage: boolean; isLoading: boolean } => {
  const { isAdmin, manageAgents } = useUiPrivileges();
  const { currentUser, isLoading } = useCurrentUser();

  const canManage = useMemo(() => {
    if (!agent) return false;
    if (agent.id === agentBuilderDefaultAgentId) return false;
    return canCurrentUserEditAgent({
      agent,
      manageAgents,
      currentUser,
      isAdmin,
      isCurrentUserLoading: isLoading,
    });
  }, [agent, currentUser, isAdmin, manageAgents, isLoading]);

  return { canManage, isLoading };
};
