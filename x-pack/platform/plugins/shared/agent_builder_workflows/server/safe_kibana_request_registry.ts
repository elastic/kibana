/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Registry of `kibana.request` (method, path) pairs that are considered
 * read-only and safe to execute inside `workflow_execute_step` without a
 * HITL confirmation dialog (Primitive A).
 *
 * Solution plugins register their paths during their own `setup()` via the
 * `AgentBuilderWorkflowsPluginSetup.registerSafeKibanaRequestPath` contract
 * instead of hard-coding them here in the platform layer.
 */
export const createSafeKibanaRequestRegistry = () => {
  const paths = new Set<string>();
  return {
    register: (method: string, path: string) => {
      paths.add(`${method.toUpperCase()}:${path}`);
    },
    isSafe: (method: string, path: string) => {
      return paths.has(`${method.toUpperCase()}:${path}`);
    },
    getPaths: () => paths as ReadonlySet<string>,
  };
};

export type SafeKibanaRequestRegistry = ReturnType<typeof createSafeKibanaRequestRegistry>;
