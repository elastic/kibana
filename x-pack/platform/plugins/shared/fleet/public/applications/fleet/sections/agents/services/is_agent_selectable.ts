/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { removeVersionSuffixFromPolicyId } from '../../../../../../common/services/version_specific_policies_utils';
import type { Agent, AgentPolicy } from '../../../types';

/**
 * Returns true if the given agent can be selected in the Fleet agents list for
 * bulk actions. Used by the table's `selection.selectable` and by the parent
 * page's `selectableAgents` count / "select all" filter.
 *
 * OpAMP collectors live on an auto-created managed policy by design; bulk
 * actions applicable to them (export, remove collector) should still be allowed.
 */
export function isAgentSelectable(
  agent: Agent,
  agentPoliciesIndexedById: Record<string, AgentPolicy>
): boolean {
  if (!agent.active) return false;
  if (!agent.policy_id) return true;

  const basePolicyId = removeVersionSuffixFromPolicyId(agent.policy_id);
  const agentPolicy = agentPoliciesIndexedById[basePolicyId];
  const isHosted = agentPolicy?.is_managed === true;

  if (isHosted && agent.type === 'OPAMP') return true;
  return !isHosted;
}
