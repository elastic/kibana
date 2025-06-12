/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlTool } from '@kbn/onechat-server';
import { z } from '@kbn/zod';
import { EsqlToolCreateRequest } from '../../../../../common/tools';

export const esqlSchema = z.object({
  params: z
    .record(z.string())
    .optional()
    .describe('Params needed to execute the query - must match defined tool parameter keys'),
});

export const esqlToolCreater = (tool: EsqlToolCreateRequest): EsqlTool => {
  const executableTool: EsqlTool = {
    id: tool.id,
    description: tool.description,
    query: tool.query,
    params: tool.params,
    schema: esqlSchema,
    handler: async ({ params }, { esClient }) => {
      try {
        const client = esClient.asCurrentUser;

        const filledQuery = tool.query.replace(/\?(\w+)/g, (_, key) => {
          if (!(key in tool.params)) {
            throw new Error(
              `Parameter ${key} not found in tool params. Available: ${Object.keys(
                tool.params
              ).join(', ')}`
            );
          }
          const value = params[key];
          if (value === undefined || value === null) {
            throw new Error(`Parameter ${key} is required but was not provided`);
          }

          return typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
        });

        const response = await client.transport.request({
          method: 'POST',
          path: '/_query',
          body: {
            query: filledQuery,
          },
        });

        return response;
      } catch (error) {
        throw error;
      }
    },
    meta: tool.meta,
  };
  return executableTool;
};
