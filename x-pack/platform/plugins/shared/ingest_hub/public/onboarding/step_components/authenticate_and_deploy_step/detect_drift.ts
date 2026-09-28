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
 * path) — those are compared against the service's effective deployed default so that saving
 * default settings in Step 2 does not appear as drift.
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
    if (!typedSession[instanceId]) {
      // No session entry for this instance. If it is still deployed (in deployedInstanceIds),
      // the user may have deselected and reselected the service — session vars were pruned but
      // the policy retains old custom settings. Treat as drift if the SO had non-empty vars.
      if (
        deployedInstanceIds?.has(instanceId) &&
        Object.keys(soServiceVars[instanceId]).length > 0
      ) {
        dirty.push(instanceId);
      }
      // Otherwise it is a truly removed instance — handled as a cleanup target; skip.
      continue;
    }
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
      // Compare against the service's effective deployed default, not a bare {}, so that a
      // session entry that merely reflects the service's defaults does not appear as drift when
      // the SO omitted those vars on an all-defaults deploy.
      const service = servicesMap.get(instanceId);
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
      if (JSON.stringify(typedSession[instanceId]) !== JSON.stringify(deployedDefault)) {
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
