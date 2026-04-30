/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { isAgentOwner } from '@kbn/agent-builder-common';
import { useUiPrivileges } from '../use_ui_privileges';
import { useCurrentUser } from './use_current_user';

/**
 * Returns whether the current user is allowed to view and edit an agent's access control list.
 *
 * Authorized when any of:
 *   - cluster admin (`isAdmin` capability)
 *   - holder of the `manageAgentAcls` sub-feature privilege
 *   - the agent's owner
 *
 * Returns `false` while the current user is still loading to avoid flashing incorrect actions.
 */
export const useCanManageAgentAccess = (
  agent: AgentDefinition | null | undefined
): { canManage: boolean; isLoading: boolean } => {
  const { isAdmin, manageAgentAcls } = useUiPrivileges();
  const { currentUser, isLoading } = useCurrentUser();

  const canManage = useMemo(() => {
    if (!agent || agent.readonly) return false;
    if (isLoading) return false;
    if (isAdmin) return true;
    if (manageAgentAcls) return true;
    return isAgentOwner({ owner: agent.created_by, currentUser });
  }, [agent, currentUser, isAdmin, manageAgentAcls, isLoading]);

  return { canManage, isLoading };
};
