/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActiveAgentStatuses } from '../constants';
import type { Agent, AgentStatus, FleetServerAgent } from '../types';

export function getPreviousAgentStatusForOfflineAgents(
  agent: Agent | FleetServerAgent
): AgentStatus | undefined {
  if (agent.unenrollment_started_at && !agent.unenrolled_at) {
    return 'unenrolling';
  }

  if (agent.last_checkin_status?.toLowerCase() === 'error') {
    return 'error';
  }
  if (agent.last_checkin_status?.toLowerCase() === 'degraded') {
    return 'degraded';
  }

  const policyRevision =
    'policy_revision' in agent
      ? agent.policy_revision
      : 'policy_revision_idx' in agent
      ? agent.policy_revision_idx
      : undefined;

  if (!policyRevision || (agent.upgrade_started_at && !agent.upgraded_at)) {
    return 'updating';
  }
}

/**
 * True when Fleet has sent an unenroll that the agent has not acknowledged yet.
 *
 * Prefer this over `agent.status === 'unenrolling'`: the status runtime field resolves `offline`,
 * `inactive`, `updating` and `enrolling` ahead of `unenrolling`, so an agent that was sent an
 * UNENROLL and then went dark — the case this is meant to catch — never reports `unenrolling`.
 *
 * Once #297992 lands this also needs `&& !agent.uninstall_pending`: a remote uninstall sends an
 * UNENROLL as its first step and Fleet Server records the pending state without writing
 * `unenrolled_at`, so both clauses below hold for an agent that did acknowledge the request.
 */
export function hasPendingUnenroll(
  agent: Agent
): agent is Agent & { unenrollment_started_at: string } {
  const { unenrollment_started_at: unenrollmentStartedAt, unenrolled_at: unenrolledAt } = agent;

  return Boolean(unenrollmentStartedAt && !unenrolledAt);
}

export function buildKueryForUnenrolledAgents(): string {
  return 'status:unenrolled';
}
export function buildKueryForUninstalledAgents(): string {
  return 'status:uninstalled';
}
export function buildKueryForOrphanedAgents(): string {
  return 'status:orphaned';
}

export function buildKueryForOnlineAgents(): string {
  return 'status:online';
}

export function buildKueryForErrorAgents(): string {
  return '(status:error or status:degraded)';
}

export function buildKueryForOfflineAgents(): string {
  return 'status:offline';
}

export function buildKueryForUpdatingAgents(): string {
  return '(status:updating or status:unenrolling or status:enrolling)';
}

export function buildKueryForInactiveAgents() {
  return 'status:inactive';
}

export function buildKueryForActiveAgents() {
  return `(${ActiveAgentStatuses.map((s) => `status:${s}`).join(' or ')})`;
}

export const AGENT_UPDATING_TIMEOUT_HOURS = 2;

export function isStuckInUpdating(agent: Agent): boolean {
  const hasTimedOut = (upgradeStartedAt: string) =>
    Date.now() - Date.parse(upgradeStartedAt) > AGENT_UPDATING_TIMEOUT_HOURS * 60 * 60 * 1000;
  return (
    (agent.status !== 'offline' &&
      agent.active &&
      isAgentInFailedUpgradeState(agent.upgrade_details)) ||
    (agent.status === 'updating' &&
      !!agent.upgrade_started_at &&
      !agent.upgraded_at &&
      hasTimedOut(agent.upgrade_started_at) &&
      !agent.upgrade_details?.state)
  );
}

export function isAgentInFailedUpgradeState(upgradeDetails?: Agent['upgrade_details']): boolean {
  return upgradeDetails?.state === 'UPG_FAILED';
}
