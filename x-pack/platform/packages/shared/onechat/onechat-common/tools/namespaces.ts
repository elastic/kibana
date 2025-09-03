/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * List of internally used namespaces
 * Note: those are not necessarily all protected.
 */
export const internalNamespaces = {
  platformCore: 'platform.core',
} as const;

/**
 * List of protected namespaces which can only be used by internal tools.
 */
export const protectedNamespaces = [internalNamespaces.platformCore] as const;

/**
 * Checks if the provided tool name belongs to a reserved namespace.
 */
export const isInProtectedNamespace = (toolName: string) => {
  for (const namespace of protectedNamespaces) {
    if (toolName.startsWith(`${namespace}.`)) {
      return true;
    }
  }
  return false;
};
