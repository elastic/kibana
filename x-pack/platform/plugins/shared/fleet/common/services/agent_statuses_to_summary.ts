/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent, AgentStatus, SimplifiedAgentStatus } from '../types';

export function agentStatusesToSummary(
  statuses: Record<AgentStatus, number>,
  rawAgents: Agent[]
): Record<SimplifiedAgentStatus, number> {
  const orphaned = rawAgents
    ? rawAgents.filter((agent) => agent.audit_unenrolled_reason === 'orphaned').length
    : 0;
  const uninstalled = rawAgents
    ? rawAgents.filter((agent) => agent.audit_unenrolled_reason === 'uninstall').length
    : 0;
  return {
    healthy: statuses.online,
    unhealthy: statuses.error + statuses.degraded,
    inactive: statuses.inactive,
    offline: statuses.offline - (orphaned + uninstalled),
    updating: statuses.updating + statuses.enrolling + statuses.unenrolling,
    unenrolled: statuses.unenrolled,
    orphaned,
    uninstalled,
  };
}
