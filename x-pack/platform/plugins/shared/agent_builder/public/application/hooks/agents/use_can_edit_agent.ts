/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { canCurrentUserEditAgent } from '@kbn/agent-builder-common';
import { useUiPrivileges } from '../use_ui_privileges';
import { useCurrentUser } from './use_current_user';

export const useCanEditAgent = ({ agent }: { agent: AgentDefinition | null }): boolean => {
  const { manageAgents, isAdmin } = useUiPrivileges();
  const { currentUser, isLoading: isCurrentUserLoading } = useCurrentUser();

  return useMemo(() => {
    if (!agent) {
      return false;
    }
    return canCurrentUserEditAgent({
      agent,
      manageAgents,
      currentUser,
      isAdmin,
      isCurrentUserLoading,
    });
  }, [agent, manageAgents, currentUser, isAdmin, isCurrentUserLoading]);
};
