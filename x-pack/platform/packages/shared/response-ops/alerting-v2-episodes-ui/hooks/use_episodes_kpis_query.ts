/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { TimeRange } from '@kbn/es-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useSpaceId } from './use_space_id';
import { useCurrentUserProfile } from './use_current_user_profile';
import { buildEpisodesKpisQuery, type EpisodesFilterState } from '../queries/episodes_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { queryKeys } from '../query_keys';

export interface EpisodesKpisData {
  alertsCount: number;
  firingRules: number;
  assignedToMe: number;
  unassigned: number;
  acknowledged: number;
  snoozed: number;
}

interface EpisodesKpisRow {
  alerts_count: number;
  firing_rules: number;
  assigned_to_me: number;
  unassigned: number;
  acknowledged: number;
  snoozed: number;
}

export interface UseEpisodesKpisQueryOptions {
  services: {
    expressions: ExpressionsStart;
    spaces: SpacesPluginStart;
    userProfile: CoreStart['userProfile'];
  };
  filterState?: EpisodesFilterState;
  timeRange?: TimeRange;
}

export interface UseEpisodesKpisQueryResult {
  data: EpisodesKpisData | undefined;
  isLoading: boolean;
  isError: boolean;
}

export const useEpisodesKpisQuery = ({
  services,
  filterState,
  timeRange,
}: UseEpisodesKpisQueryOptions): UseEpisodesKpisQueryResult => {
  const spaceId = useSpaceId(services.spaces);

  // The current user profile is only needed to compute the "assigned to me"
  // count. Users without a profile (anonymous or proxy-authenticated) still get
  // KPIs; their "assigned to me" count is simply always 0.
  const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentUserProfile({
    userProfile: services.userProfile,
  });

  const currentUserUid = currentUser?.uid;

  const {
    data,
    isLoading: isKpisLoading,
    error,
  } = useQuery<EpisodesKpisRow[], Error, EpisodesKpisData | undefined>({
    queryKey: queryKeys.kpis(spaceId, filterState, timeRange, currentUserUid),
    queryFn: ({ signal }) => {
      const query = buildEpisodesKpisQuery(spaceId, currentUserUid, filterState);
      return executeEsqlQuery<EpisodesKpisRow>({
        expressions: services.expressions,
        query,
        input: {
          type: 'kibana_context' as const,
          esqlVariables: [],
          ...(timeRange ? { timeRange } : {}),
        },
        abortSignal: signal,
      });
    },
    select: (rows) => {
      const row = rows[0];
      if (!row) return undefined;
      return {
        alertsCount: row.alerts_count ?? 0,
        firingRules: row.firing_rules ?? 0,
        assignedToMe: row.assigned_to_me ?? 0,
        unassigned: row.unassigned ?? 0,
        acknowledged: row.acknowledged ?? 0,
        snoozed: row.snoozed ?? 0,
      };
    },
    // Wait until the profile query settles (resolved or `null`) so the KPIs
    // query fires once with a stable `currentUserUid`, instead of firing with
    // `undefined` and immediately refetching once the profile loads.
    enabled: !isCurrentUserLoading,
  });

  return {
    data,
    isLoading: isCurrentUserLoading || isKpisLoading,
    isError: !!error,
  };
};
