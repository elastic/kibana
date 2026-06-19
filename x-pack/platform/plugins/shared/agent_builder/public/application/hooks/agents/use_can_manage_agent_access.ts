/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { canChangeAgentAccessControl } from '@kbn/agent-builder-common';
import { useUiPrivileges } from '../use_ui_privileges';
import { useCurrentUser } from './use_current_user';

/**
 * Returns whether the current user is allowed to view and edit an agent's access control.
 *
 * ACL entry edits can grant higher permissions, so they use the same Manager-level
 * authorization check as access-control mode changes.
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
    if (!manageAgents || isLoading) return false;
    return canChangeAgentAccessControl({
      agentId: agent.id,
      accessControl: agent.access_control,
      owner: agent.created_by,
      currentUser: currentUser ?? undefined,
      isAdmin,
    });
  }, [agent, currentUser, isAdmin, manageAgents, isLoading]);

  return { canManage, isLoading };
};
