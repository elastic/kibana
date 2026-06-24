/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedHistory } from '@kbn/core-application-browser';

interface PendingAgentWorkspaceNavigation {
  path: string;
  state?: unknown;
}

let scopedHistory: ScopedHistory | null = null;
let pendingNavigation: PendingAgentWorkspaceNavigation | null = null;

export const setAgentWorkspaceScopedHistory = (history: ScopedHistory | null): void => {
  scopedHistory = history;

  if (history && pendingNavigation) {
    history.push(pendingNavigation.path, pendingNavigation.state);
    pendingNavigation = null;
  }
};

/**
 * Routes an in-app Agent Builder path to the agent workspace column scoped history.
 * Used when `/app/agent_builder` deep links are redirected out of the application workspace.
 */
export const requestAgentWorkspaceNavigation = (path: string, state?: unknown): void => {
  if (scopedHistory) {
    scopedHistory.push(path, state);
    return;
  }

  pendingNavigation = { path, state };
};

export const clearAgentWorkspaceNavigation = (): void => {
  scopedHistory = null;
  pendingNavigation = null;
};
