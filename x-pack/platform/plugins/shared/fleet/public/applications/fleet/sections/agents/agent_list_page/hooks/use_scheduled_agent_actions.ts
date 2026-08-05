/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import type { AgentActionType, ActionStatus } from '../../../../../../types';
import { sendGetActionStatus } from '../../../../../../hooks/use_request/agents';
import { isScheduledAction } from '../components/agent_activity_flyout/agent_activity_helper';

const REFRESH_INTERVAL_MS = 30000;

export interface ScheduledAgentActionsResult {
  /** Pending scheduled actions with startTime > now, sorted by startTime ascending */
  scheduledActions: ActionStatus[];
  /** Earliest startTime across all pending scheduled actions */
  nextStartTime?: string;
  /** Sum of agents not yet acknowledged across all pending scheduled actions */
  totalAgentsScheduled: number;
}

/**
 * Polls for pending scheduled agent actions (startTime in the future).
 * Defaults to UNENROLL only — pass `types` to include other action types.
 */
export function useScheduledAgentActions(options?: {
  types?: AgentActionType[];
  enabled?: boolean;
}): ScheduledAgentActionsResult {
  const { types = ['UNENROLL'], enabled = true } = options ?? {};

  const { data: scheduledActions = [] } = useQuery({
    queryKey: ['get-scheduled-action-statuses'],
    enabled,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const res = await sendGetActionStatus({ scheduledOnly: true, perPage: 10, errorSize: 0 });
      const items = res.data?.items ?? [];

      // Belt-and-braces: filter client-side to guard against browser/ES clock skew
      // and to scope to the requested action types.
      return items
        .filter((a) => types.includes(a.type) && isScheduledAction(a))
        .sort((a, b) => (a.startTime! < b.startTime! ? -1 : 1));
    },
  });

  const nextStartTime = scheduledActions[0]?.startTime;
  const totalAgentsScheduled = scheduledActions.reduce(
    (sum, a) => sum + (a.nbAgentsActioned - a.nbAgentsAck),
    0
  );

  return { scheduledActions, nextStartTime, totalAgentsScheduled };
}
