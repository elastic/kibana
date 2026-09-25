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
 * Only instances that appear in `soServiceVars` are checked — new instances (not yet deployed) are
 * not "dirty", they're just new deploy targets.
 */
export function detectServiceVarsDrift(
  sessionServiceVars: Record<string, ServiceVars>,
  soServiceVars: Record<string, Record<string, unknown>>,
  servicesMap: Map<string, AwsServiceMatrixEntry>
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
