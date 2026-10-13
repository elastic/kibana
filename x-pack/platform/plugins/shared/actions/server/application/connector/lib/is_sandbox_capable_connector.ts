/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistry } from '../../../action_type_registry';

/**
 * True when the connector can use sandbox credential injection: either the action type opts in
 * via isSandboxCapable, or config.authType is in sandboxSupportedAuthTypes (spec auth opt-in).
 */
export const isSandboxCapableConnector = ({
  actionTypeId,
  config,
  actionTypeRegistry,
}: {
  actionTypeId: string;
  config?: Record<string, unknown>;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'get'>;
}): boolean => {
  if (!actionTypeRegistry.has(actionTypeId)) {
    return false;
  }

  const actionType = actionTypeRegistry.get(actionTypeId);
  if (actionType.isSystemActionType) {
    return false;
  }

  // Secrets are not decrypted at list time, so the predicate must work from config alone.
  if (actionType.isSandboxCapable?.({ config: config ?? {}, secrets: {} })) {
    return true;
  }

  const sandboxSupportedAuthTypes = actionType.sandboxSupportedAuthTypes ?? [];
  const { authType } = config ?? {};
  return (
    typeof authType === 'string' &&
    authType.length > 0 &&
    sandboxSupportedAuthTypes.includes(authType)
  );
};
