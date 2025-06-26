/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredTool, tool as toTool } from '@langchain/core/tools';
import { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  toolDescriptorToIdentifier,
  toStructuredToolIdentifier,
  type ToolIdentifier,
  type StructuredToolIdentifier,
} from '@kbn/onechat-common';
import type { ToolProvider, ExecutableTool } from '@kbn/onechat-server';

export const providerToLangchainTools = async ({
  request,
  toolProvider,
  logger,
}: {
  request: KibanaRequest;
  toolProvider: ToolProvider;
  logger: Logger;
}): Promise<StructuredTool[]> => {
  const allTools = await toolProvider.list({ request });
  return Promise.all(
    allTools.map((tool) => {
      return toLangchainTool({ tool, logger });
    })
  );
};

/**
 * LLM provider have a specific format for toolIds, to we must convert to use allowed characters.
 */
export const toolIdToLangchain = (toolIdentifier: ToolIdentifier): string => {
  const { toolId, providerId } = toStructuredToolIdentifier(toolIdentifier);
  return `${toolId}__${providerId}`;
};

export const toolIdFromLangchain = (toolId: string): StructuredToolIdentifier => {
  const splits = toolId.split('__');
  if (splits.length !== 2) {
    throw new Error('Tool id must be in the format of <toolId>__<providerId>');
  }
  return {
    toolId: splits[0],
    providerId: splits[1],
  };
};

export const toLangchainTool = ({
  tool,
  logger,
}: {
  tool: ExecutableTool;
  logger: Logger;
}): StructuredTool => {
  const toolId = toolDescriptorToIdentifier(tool);
  return toTool(
    async (input) => {
      try {
        const toolReturn = await tool.execute({ toolParams: input });
        return JSON.stringify(toolReturn.result);
      } catch (e) {
        logger.warn(`error calling tool ${tool.id}: ${e.message}`);
        throw e;
      }
    },
    {
      name: toolIdToLangchain(toolId),
      description: tool.description,
      schema: tool.schema,
    }
  );
};
