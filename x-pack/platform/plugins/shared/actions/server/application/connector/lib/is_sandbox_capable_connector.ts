/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistry } from '../../../action_type_registry';
import { getConnectorSandboxHosts } from './get_connector_sandbox_hosts';

interface SandboxCapableConnectorOptions {
  actionTypeId: string;
  config?: Record<string, unknown>;
  /** Persisted connector lists omit secrets; credential resolution supplies validated secrets. */
  secrets?: Record<string, unknown>;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'get'>;
}

/**
 * True when the connector's auth supports sandbox credential injection: either the action type
 * opts in via isSandboxCapable, or config.authType is in sandboxSupportedAuthTypes (spec auth
 * opt-in). Does not check sandbox hosts; see isSandboxCapableConnector.
 */
export const hasSandboxCapableAuth = ({
  actionTypeId,
  config,
  secrets,
  actionTypeRegistry,
}: SandboxCapableConnectorOptions): boolean => {
  if (!actionTypeRegistry.has(actionTypeId)) {
    return false;
  }

  const actionType = actionTypeRegistry.get(actionTypeId);
  if (actionType.isSystemActionType) {
    return false;
  }

  // Stored secrets are not decrypted at list time, so the predicate works from config alone
  // unless the caller already holds the secrets in memory.
  if (actionType.isSandboxCapable?.({ config: config ?? {}, secrets: secrets ?? {} })) {
    return true;
  }

  const sandboxSupportedAuthTypes = actionType.sandboxSupportedAuthTypes ?? [];
  const authType = secrets?.authType ?? config?.authType;
  return (
    typeof authType === 'string' &&
    authType.length > 0 &&
    sandboxSupportedAuthTypes.includes(authType)
  );
};

/**
 * True when the connector can use sandbox credential injection: its auth supports it and it
 * resolves to at least one sandbox host the credential proxy accepts. A connector with no valid
 * hosts is left out of sandbox connector lists, so it cannot break sandbox use for others.
 */
export const isSandboxCapableConnector = (options: SandboxCapableConnectorOptions): boolean =>
  hasSandboxCapableAuth(options) &&
  getConnectorSandboxHosts({
    actionType: options.actionTypeRegistry.get(options.actionTypeId),
    config: options.config,
  }).length > 0;
