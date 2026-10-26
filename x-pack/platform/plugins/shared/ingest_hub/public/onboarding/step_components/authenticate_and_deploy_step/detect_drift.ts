/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceVars } from '../service_settings_step/use_service_settings';
import { toSOServiceVars } from './package_inputs';

/**
 * Returns instanceIds whose serviceVars differ between the current session and the last-deployed SO.
 * Both sides are normalized through toSOServiceVars so string/array field representations match.
 * Instances present in `soServiceVars` are compared directly. `deployedInstanceIds` covers the
 * case where an instance was deployed but its serviceVars were never written to the SO (all-defaults
 * path) — those are compared against the service's effective deployed default so that saving
 * default settings in Step 2 does not appear as drift.
 */
// Duplicate instances have instanceId = `${serviceId}__dup-${n}`; the servicesMap is keyed
// by serviceId. Strip the suffix so lookups work for both originals and duplicates.
function getServiceId(instanceId: string): string {
  const dupIdx = instanceId.indexOf('__dup-');
  return dupIdx >= 0 ? instanceId.slice(0, dupIdx) : instanceId;
}

export function detectServiceVarsDrift(
  sessionServiceVars: Record<string, ServiceVars>,
  soServiceVars: Record<string, Record<string, unknown>>,
  servicesMap: Map<string, AwsServiceMatrixEntry>,
  deployedInstanceIds?: Set<string>
): string[] {
  const typedSession = toSOServiceVars(sessionServiceVars, servicesMap) as Record<
    string,
    Record<string, unknown>
  >;
  const dirty: string[] = [];
  for (const instanceId of Object.keys(soServiceVars)) {
    // Skip instances outside the deployment scope (e.g. ECF-only services in a mixed
    // MI+ECF deployment). Their serviceVars are stored in the SO but MI redeploy cannot
    // update the running ECF stack — marking them dirty would clear the callout without
    // actually applying the changes.
    if (deployedInstanceIds && !deployedInstanceIds.has(instanceId)) continue;
    if (!typedSession[instanceId]) {
      // No session entry for this instance. If it is still deployed (in deployedInstanceIds)
      // the user deselected and reselected the service — session vars were pruned. Compare the
      // SO against the service's effective default so that a reselected instance whose settings
      // were not re-edited does not appear as drift.
      if (deployedInstanceIds?.has(instanceId)) {
        const service = servicesMap.get(getServiceId(instanceId));
        const deployedDefault = service
          ? toSOServiceVars(
              { [instanceId]: { enabledDataStreams: service.dataStreams, varsByDataStream: {} } },
              servicesMap
            )[instanceId] ?? {}
          : {};
        if (!isEqual(deployedDefault, soServiceVars[instanceId])) {
          dirty.push(instanceId);
        }
      }
      // Otherwise it is a truly removed instance — handled as a cleanup target; skip.
      continue;
    }
    if (!isEqual(typedSession[instanceId], soServiceVars[instanceId])) {
      dirty.push(instanceId);
    }
  }
  // Also check deployed instances whose serviceVars the SO never stored (all-defaults deploy path).
  // These don't appear in soServiceVars, so the loop above would skip them entirely.
  if (deployedInstanceIds) {
    for (const instanceId of deployedInstanceIds) {
      if (soServiceVars[instanceId] !== undefined) continue; // already checked above
      if (!typedSession[instanceId]) continue; // removed — handled by cleanup
      // Compare against the service's effective deployed default, not a bare {}, so that a
      // session entry that merely reflects the service's defaults does not appear as drift when
      // the SO omitted those vars on an all-defaults deploy. Use getServiceId so duplicates
      // (e.g. elb__dup-1) resolve to the correct servicesMap entry.
      const service = servicesMap.get(getServiceId(instanceId));
      const deployedDefault = service
        ? toSOServiceVars(
            {
              [instanceId]: {
                enabledDataStreams: service.dataStreams,
                varsByDataStream: {},
              },
            },
            servicesMap
          )[instanceId] ?? {}
        : {};
      if (!isEqual(typedSession[instanceId], deployedDefault)) {
        dirty.push(instanceId);
      }
    }
  }
  return dirty;
}

/**
 * Returns true when the deployed connector differs from the session connector.
 * Auth method switching is disabled in edit mode so only a connector swap can produce auth drift.
 */
export function detectAuthDrift(
  session: { connectorId?: string },
  so: { connectorId?: string | null }
): boolean {
  return session.connectorId !== (so.connectorId ?? undefined);
}

/**
 * Returns true when the agent policy selection has drifted from the last-deployed SO state.
 * Only meaningful for agent_based deployments — MI SOs never write agentPolicyIds.
 */
export function detectAgentPoliciesDrift(
  session: {
    deploymentMethod: string;
    agentHostsMode?: string;
    agentPolicyId?: string;
    selectedAgentPolicyIds?: string[];
  },
  so: { agentPolicyIds?: string[] | null }
): boolean {
  if (session.deploymentMethod !== 'agent_based') return false;
  const { agentHostsMode, agentPolicyId, selectedAgentPolicyIds } = session;
  if (agentHostsMode === 'new') {
    // Flyout created the new policy but packages not yet deployed to it: dirty until
    // the next deploy attaches package policies to the new agent policy.
    if (agentPolicyId && !(so.agentPolicyIds ?? []).includes(agentPolicyId)) return true;
    // Mode switch without flyout: dirty when a prior deployment exists. Guard on !agentPolicyId
    // so a successful new-policy deploy (which writes agentPolicyId) is not treated as drift.
    if ((so.agentPolicyIds ?? []).length > 0 && !agentPolicyId) return true;
    return false;
  }
  const selected = new Set(selectedAgentPolicyIds);
  if (selected.size === 0 && agentHostsMode !== 'existing') return false;
  const deployed = new Set(so.agentPolicyIds ?? []);
  return selected.size !== deployed.size || [...selected].some((id) => !deployed.has(id));
}
