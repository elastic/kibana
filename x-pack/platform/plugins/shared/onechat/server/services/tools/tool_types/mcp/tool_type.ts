/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { McpToolConfig } from '@kbn/onechat-common/tools';
import type { AnyToolTypeDefinition } from '../definitions';
import { configurationSchema, configurationUpdateSchema } from './schemas';

export const getMcpToolType = (): AnyToolTypeDefinition<
  ToolType.mcp,
  McpToolConfig,
  z.ZodObject<any>
> => {
  return {
    toolType: ToolType.mcp,
    getDynamicProps: (config, { spaceId }) => {
      return {
        getHandler: () => {
          return async (params, context) => {
            // TODO: Implement handler
            return {
              results: [],
            };
          };
        },
        getSchema: async () => {
          // TODO: Generate schema from MCP tool
          return z.object({});
        },
        getLlmDescription: ({ description }) => {
          // TODO: Generate LLM description (if needed)
          return description;
        },
      };
    },
    createSchema: configurationSchema,
    updateSchema: configurationUpdateSchema,
    validateForCreate: async ({ config, context }) => {
      // TODO: Implement KSC + MCP tool validation
      return config;
    },
    validateForUpdate: async ({ update, current, context }) => {
      // TODO: Implement KSC + MCP tool validation
      return {
        ...current,
        ...update,
      };
    },
  };
};
