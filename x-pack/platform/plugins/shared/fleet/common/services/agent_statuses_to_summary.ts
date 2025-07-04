/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentStatus, SimplifiedAgentStatus } from '../types';

export function agentStatusesToSummary(
  statuses: Record<AgentStatus, number>
): Record<SimplifiedAgentStatus, number> {
  return {
    healthy: statuses.online,
    unhealthy: statuses.error + statuses.degraded,
    inactive: statuses.inactive,
    offline: statuses.offline,
    updating: statuses.updating + statuses.enrolling + statuses.unenrolling,
    unenrolled: statuses.unenrolled,
    orphaned: statuses.orphaned,
    uninstalled: statuses.uninstalled,
  };
}
