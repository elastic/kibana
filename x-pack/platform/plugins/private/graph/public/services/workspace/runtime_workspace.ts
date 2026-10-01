/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuntimeWorkspace, WorkspaceOptions } from '../../types/workspace_state';

export const createWorkspace = (options: WorkspaceOptions): RuntimeWorkspace => {
  const layoutController = options.layoutController;

  return {
    blocklistedNodes: [],
    options,
    nodesMap: {},
    edgesMap: {},
    nodes: [],
    edges: [],
    stopLayout: () => layoutController.stop(),
    runLayout: () => layoutController.start(),
    isLayoutRunning: () => layoutController.isRunning(),
  };
};
