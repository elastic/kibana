/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The namespace an instance deploys into: its own, which only a duplicate has, else the global
 * namespace. Empty means the policy inherits the namespace of its agent policy (or `default` for a
 * managed integration).
 */
export const getEffectiveNamespace = (
  instanceId: string,
  serviceVars: Record<string, { namespace?: string }>,
  globalNamespace?: string
): string => serviceVars[instanceId]?.namespace || globalNamespace || '';
