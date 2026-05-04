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
  platformDashboard: 'platform.dashboard',
  platformStreams: 'platform.streams',
  filestore: 'filestore',
  attachments: 'attachments',
  observability: 'observability',
  search: 'search',
  security: 'security',
  streams: 'platform.streams',
  workflows: 'platform.workflows',
} as const;

/**
 * List of protected namespaces which can only be used by internal tools.
 */
export const protectedNamespaces: string[] = [
  internalNamespaces.platformCore,
  internalNamespaces.attachments,
  internalNamespaces.filestore,
  internalNamespaces.observability,
  internalNamespaces.platformDashboard, // Owned by dashboard_agent plugin
  internalNamespaces.platformStreams,
  internalNamespaces.search,
  internalNamespaces.security,
  internalNamespaces.streams,
  internalNamespaces.workflows,
];

/**
 * Checks if the provided tool name belongs to a protected namespace.
 */
export const isInProtectedNamespace = (toolName: string) => {
  for (const namespace of protectedNamespaces) {
    if (toolName.startsWith(`${namespace}.`)) {
      return true;
    }
  }
  return false;
};

/**
 * Checks if the provided name is an internal or protected namespace.
 */
export const hasNamespaceName = (toolName: string) => {
  return (
    protectedNamespaces.includes(toolName) ||
    (Object.values(internalNamespaces) as string[]).includes(toolName)
  );
};
