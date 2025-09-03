/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * List of internally used namespaces
 */
export const internalNamespaces = {
  platformCore: 'platform.core',
} as const;

/**
 * List of reserved namespaces which can only be used by internal tools.
 */
export const reservedNamespaces = [internalNamespaces.platformCore] as const;

export const isToolInReservedNamespace = (toolName: string) => {
  for (const namespace of reservedNamespaces) {
    if (toolName.startsWith(`${namespace}.`)) {
      return true;
    }
  }
  return false;
};
