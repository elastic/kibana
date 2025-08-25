/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import type { OneChatToolWithClientCallback } from '../common/types';
import { convertParametersToSchema } from '../common/schema_adapters';

interface AssistantToolParams {
  connectorId: string;
  llmTasks: any;
  request: any;
  contentReferencesStore: any;
}

export const mapToolToServerSideSecuritySolutionTool = <T extends {}, Dependencies extends {}>(
  toolDetails: OneChatToolWithClientCallback<Dependencies>
): T => {
  const isSupported = (params: any) => {
    // @todo
    return true;
  };
  return {
    id: toolDetails.id,
    name: toolDetails.name,
    description: toolDetails.description,
    // parameters: toolDetails.parameters,
    sourceRegister: 'clientSideTool',
    isSupported,
    getTool(params: AssistantToolParams) {
      if (!isSupported(params)) return null;

      const { connectorId, llmTasks, request, contentReferencesStore } =
        params as AssistantToolParams;

      // This check is here in order to satisfy TypeScript
      if (llmTasks == null || connectorId == null) return null;

      return tool(
        async (result: any) => {
          return {
            content: result,
          };
        },
        {
          name: toolDetails.name,
          description: toolDetails.description,
          schema: convertParametersToSchema(toolDetails.parameters),
          tags: toolDetails.tags || [],
        }
      );
    },
  };
};
