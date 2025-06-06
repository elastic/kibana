/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredTool, tool as toTool } from '@langchain/core/tools';
import { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import { toolDescriptorToIdentifier, toSerializedToolIdentifier } from '@kbn/onechat-common';
import type { ToolProvider, ExecutableTool, ScopedRunner } from '@kbn/onechat-server';

export const providerToLangchainTools = async ({
  request,
  toolProvider,
  logger,
  runner,
}: {
  request: KibanaRequest;
  toolProvider: ToolProvider;
  logger: Logger;
  runner: ScopedRunner;
}): Promise<StructuredTool[]> => {
  const allTools = await toolProvider.list({ request });
  return Promise.all(
    allTools.map((tool) => {
      return toLangchainTool({ tool, logger, runner });
    })
  );
};

export const toLangchainTool = ({
  tool,
  logger,
  runner,
}: {
  tool: ExecutableTool;
  runner: ScopedRunner;
  logger: Logger;
}): StructuredTool => {
  const toolId = toolDescriptorToIdentifier(tool);
  return toTool(
    async (input) => {
      try {
        const toolReturn = await runner.runTool({
          toolId,
          toolParams: input,
        });
        return JSON.stringify(toolReturn.result);
      } catch (e) {
        logger.warn(`error calling tool ${tool.name}: ${e.message}`);
        throw e;
      }
    },
    {
      name: toSerializedToolIdentifier(toolId),
      description: tool.description,
      schema: tool.schema,
    }
  );
};
