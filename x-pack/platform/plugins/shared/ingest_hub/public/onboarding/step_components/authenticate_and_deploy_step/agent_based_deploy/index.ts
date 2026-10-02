/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Agent-based deploy module — sibling to deploy_groups.ts but deliberately NOT an extension of it.
 *
 * Like the agentless path, we group originals by package (one package policy per package) and give
 * each duplicate its own separate package policy. This mirrors `groupByPackage` in
 * deploy_group_helpers.ts and avoids the stream-key collision problem that would arise if two
 * duplicate instances of the same service were bundled into one policy document.
 *
 * Unlike `buildDeployGroups`, we accept ALL services regardless of deploymentMethods — the
 * agent-based path is not restricted to services that declare `managed_integration`.
 */

export type { AgentBasedTarget } from './targets';
export { buildAgentBasedTargets } from './targets';

export { buildAgentPolicyName } from './agent_policy_name';

export type { DeployNewAgentPolicyResult } from './deploy_new_policy';
export { deployNewAgentPolicy } from './deploy_new_policy';

export type { DeployToExistingResult } from './deploy_existing_policies';
export { deployToExistingAgentPolicies } from './deploy_existing_policies';

export { collectDeployResults } from '../deploy_group_helpers';
export { extractErrorMessage } from '../deploy_errors';

import type { ServiceChipState } from '../../../onboarding_flow_context';
import type { DeployGroup } from '../deploy_groups';
import { buildInstanceStatuses } from '../deploy_groups';

export interface AgentBasedDeployOutcome {
  policyIdsByInstance: Record<string, string>;
  failedInstances: string[];
  errorsByInstance: Record<string, string>;
}

/**
 * Build serviceStatuses for all groups.
 * Succeeded → 'detecting' (data detection polling will promote to 'receiving').
 * Failed → 'error'.
 */
export function buildAgentBasedInstanceStatuses(
  groups: DeployGroup[],
  failedInstances: string[]
): Record<string, ServiceChipState> {
  const allInstanceIds = groups.flatMap((g) => g.instanceIds);
  return buildInstanceStatuses(allInstanceIds, failedInstances, 'detecting');
}
