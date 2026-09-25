/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceVars } from '../service_settings_step/use_service_settings';
import { toSOServiceVars } from './package_inputs';

/**
 * Returns instanceIds whose serviceVars differ between the current session and the last-deployed SO.
 * Both sides are normalized through toSOServiceVars so string/array field representations match.
 * Instances present in `soServiceVars` are compared directly. `deployedInstanceIds` covers the
 * case where an instance was deployed but its serviceVars were never written to the SO (all-defaults
 * path) — those are compared against an empty object so any session change is detected.
 */
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
    // Skip instances the user has removed — they are not settings drift; they are handled
    // separately as cleanup targets (pendingCleanupPolicyIds).
    if (!typedSession[instanceId]) continue;
    if (JSON.stringify(typedSession[instanceId]) !== JSON.stringify(soServiceVars[instanceId])) {
      dirty.push(instanceId);
    }
  }
  // Also check deployed instances whose serviceVars the SO never stored (all-defaults deploy path).
  // These don't appear in soServiceVars, so the loop above would skip them entirely.
  if (deployedInstanceIds) {
    for (const instanceId of deployedInstanceIds) {
      if (soServiceVars[instanceId] !== undefined) continue; // already checked above
      if (!typedSession[instanceId]) continue; // removed — handled by cleanup
      if (JSON.stringify(typedSession[instanceId]) !== JSON.stringify({})) {
        dirty.push(instanceId);
      }
    }
  }
  return dirty;
}

/**
 * Returns true when the session auth method or connector differs from what was last deployed.
 * A change to either field means the deployed policy credentials are stale.
 */
export function detectAuthDrift(
  session: { authMethod?: string; connectorId?: string },
  so: { authMethod?: string | null; connectorId?: string | null }
): boolean {
  return (
    session.authMethod !== (so.authMethod ?? undefined) ||
    session.connectorId !== (so.connectorId ?? undefined)
  );
}
