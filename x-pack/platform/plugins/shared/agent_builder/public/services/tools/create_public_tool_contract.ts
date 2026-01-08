/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolServiceStartContract } from '@kbn/agent-builder-browser';
import type { ToolsService } from './tools_service';

export const createPublicToolContract = ({
  toolsService,
}: {
  toolsService: ToolsService;
}): ToolServiceStartContract => {
  return {
    get: async (toolId) => {
      return toolsService.get({ toolId });
    },
    list: async () => {
      return toolsService.list();
    },
    execute: async ({ toolId, toolParams, connectorId }) => {
      return toolsService.execute({ toolId, toolParams, connectorId });
    },
  };
};
