/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistry } from '../../../action_type_registry';

/**
 * True when the connector can use sandbox credential injection: its auth type is in
 * sandboxSupportedAuthTypes (spec auth opt-in).
 */
export const isSandboxCapableConnector = ({
  actionTypeId,
  config,
  secrets,
  actionTypeRegistry,
}: {
  actionTypeId: string;
  config?: Record<string, unknown>;
  /** Only pass secrets that are already in memory (in-memory connectors); list paths omit it. */
  secrets?: Record<string, unknown>;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'get'>;
}): boolean => {
  if (!actionTypeRegistry.has(actionTypeId)) {
    return false;
  }

  const actionType = actionTypeRegistry.get(actionTypeId);
  if (actionType.isSystemActionType) {
    return false;
  }

  const sandboxSupportedAuthTypes = actionType.sandboxSupportedAuthTypes ?? [];
  const authType = config?.authType ?? secrets?.authType;
  return (
    typeof authType === 'string' &&
    authType.length > 0 &&
    sandboxSupportedAuthTypes.includes(authType)
  );
};
