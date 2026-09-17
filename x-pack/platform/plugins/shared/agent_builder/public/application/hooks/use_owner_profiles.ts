/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { useKibana } from './use_kibana';
import { queryKeys } from '../query_keys';

const EMPTY_PROFILES = new Map<string, string>();

export const useOwnerProfiles = (agents: AgentDefinition[]): Map<string, string> => {
  const { services } = useKibana();

  const { uids, sortedUids } = useMemo(() => {
    const set = new Set<string>();
    for (const agent of agents) {
      if (agent.created_by?.id) set.add(agent.created_by.id);
      if (agent.updated_by?.id) set.add(agent.updated_by.id);
    }
    return { uids: set, sortedUids: [...set].sort() };
  }, [agents]);

  const { data } = useQuery({
    queryKey: queryKeys.security.ownerProfiles(sortedUids),
    enabled: uids.size > 0 && Boolean(services.userProfile),
    retry: false,
    queryFn: async () => {
      const profiles = await services.userProfile.bulkGet({ uids });
      return new Map(profiles.map((p) => [p.uid, p.user.full_name || p.user.username]));
    },
  });

  return data ?? EMPTY_PROFILES;
};
