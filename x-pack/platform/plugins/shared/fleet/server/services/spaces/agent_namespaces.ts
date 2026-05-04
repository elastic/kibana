/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import type { Agent } from '../../types';

import { isSpaceAwarenessEnabled } from './helpers';

export const DEFAULT_NAMESPACES_FILTER = `(namespaces:"${DEFAULT_SPACE_ID}" or not namespaces:*)`;

export async function isAgentInNamespace(agent: Agent, namespace?: string) {
  const useSpaceAwareness = await isSpaceAwarenessEnabled();
  if (!useSpaceAwareness) {
    return true;
  }

  // In a custom space, only return true if the agent is explicitly in that space.
  if (namespace && namespace !== DEFAULT_SPACE_ID) {
    return agent.namespaces?.includes(namespace) ?? false;
  }

  // In the default space OR in if the current namespace is not defined,
  // return true if the agent is explicitly in the default space OR if it has no defined namespaces.
  return (
    !agent.namespaces ||
    agent.namespaces.length === 0 ||
    agent.namespaces?.includes(DEFAULT_SPACE_ID)
  );
}

export async function agentsKueryNamespaceFilter(namespace?: string) {
  const useSpaceAwareness = await isSpaceAwarenessEnabled();
  if (!useSpaceAwareness || !namespace) {
    return;
  }
  return namespace === DEFAULT_SPACE_ID ? DEFAULT_NAMESPACES_FILTER : `namespaces:(${namespace})`;
}

/**
 * Safely combines a namespace filter with a user-provided kuery by wrapping
 * each part in parentheses before joining with AND. This prevents KQL operator
 * precedence issues where OR clauses in the user kuery could bypass the
 * namespace filter.
 */
export function buildFilterWithNamespace(
  namespaceFilter: string | undefined,
  kuery: string | undefined
): string | undefined {
  const filters: string[] = [];
  if (namespaceFilter) {
    filters.push(namespaceFilter);
  }
  if (kuery && kuery.trim() !== '') {
    filters.push(kuery);
  }
  if (filters.length === 0) {
    return undefined;
  }
  return filters.map((filter) => `(${filter})`).join(' AND ');
}
