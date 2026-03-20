/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UserIdAndName } from '@kbn/agent-builder-common';
import { useKibana } from '../use_kibana';

/**
 * Fetches the current user from Kibana's User Profile service.
 */
export const useCurrentUser = ({ enabled }: { enabled: boolean }) => {
  const { services } = useKibana();

  const { data, isLoading } = useQuery({
    queryKey: ['agentBuilder', 'currentUser'],
    queryFn: async () => services.userProfile.getCurrent(),
    enabled,
  });

  const currentUser: UserIdAndName | null =
    data != null
      ? {
          id: data.uid,
          username: data.user.username,
        }
      : null;

  return { currentUser, isLoading };
};
