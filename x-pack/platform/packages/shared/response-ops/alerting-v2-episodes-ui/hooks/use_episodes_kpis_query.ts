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
import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core/public';
import type { EpisodesFilterState } from '@kbn/alerting-v2-common-queries';
import { useSpaceId } from './use_space_id';
import { useCurrentUserProfile } from './use_current_user_profile';
import { buildEpisodesKpisQuery } from '../queries/episodes_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { fetchV1AlertsKpis, type V1AlertsKpisRow } from '../apis/classic_alerts_api';
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
    http: HttpStart;
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
    queryFn: async ({ signal }) => {
      // Compute v2 and classic (v1) KPI counts in parallel and merge them. The
      // v1 read (RBAC enforced server-side) is best-effort so it never breaks KPIs.
      const [v2Rows, v1] = await Promise.all([
        executeEsqlQuery<EpisodesKpisRow>({
          expressions: services.expressions,
          query: buildEpisodesKpisQuery(spaceId, currentUserUid, filterState),
          input: {
            type: 'kibana_context' as const,
            esqlVariables: [],
            ...(timeRange ? { timeRange } : {}),
          },
          abortSignal: signal,
        }),
        fetchV1AlertsKpis({
          services,
          filterState,
          timeRange,
          abortSignal: signal,
        }).catch(() => undefined as V1AlertsKpisRow | undefined),
      ]);

      const v2 = v2Rows[0];

      // Preserve the "no rows -> undefined data" contract when neither source
      // returned counts.
      if (!v2 && !v1) {
        return [];
      }

      const v1AlertsCount = v1?.alerts_count ?? 0;

      const merged: EpisodesKpisRow = {
        // v1 rule ids are disjoint from v2, so distinct firing-rule counts sum.
        alerts_count: (v2?.alerts_count ?? 0) + v1AlertsCount,
        firing_rules: (v2?.firing_rules ?? 0) + (v1?.firing_rules ?? 0),
        // Classic alerts have no assignee, so all v1 alerts count as unassigned.
        assigned_to_me: v2?.assigned_to_me ?? 0,
        unassigned: (v2?.unassigned ?? 0) + v1AlertsCount,
        // v1 alerts map ack via workflow_status and snooze via muted/snoozed.
        acknowledged: (v2?.acknowledged ?? 0) + (v1?.acknowledged ?? 0),
        snoozed: (v2?.snoozed ?? 0) + (v1?.snoozed ?? 0),
      };

      return [merged];
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
