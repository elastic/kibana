/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';
import type { AgentBuilderCurrentUser } from '../../utils/agent_access';

/**
 * Fetches the current user from Kibana's User Profile service.
 * Used for agent visibility checks (e.g. isOwner). Only runs when `enabled` is true.
 */
export const useCurrentUser = ({ enabled }: { enabled: boolean }) => {
  const { services } = useKibana();

  const { data, isLoading } = useQuery({
    queryKey: ['agentBuilder', 'currentUser'],
    queryFn: async () => services.userProfile.getCurrent(),
    enabled,
  });

  const currentUser: AgentBuilderCurrentUser | null =
    data != null
      ? {
          uid: data.uid,
          user: { username: data.user.username, roles: data.user.roles },
        }
      : null;

  return { currentUser, isLoading };
};
