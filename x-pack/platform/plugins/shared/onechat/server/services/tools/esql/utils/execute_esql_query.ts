/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlTool } from '@kbn/onechat-server';
import { z } from '@kbn/zod';
import { EsqlToolCreateResponse } from '../../../../../common/tools';

export const esqlSchema = z.object({
  params: z
    .record(z.string())
    .optional()
    .describe('Params needed to execute the query - must match defined tool parameter keys'),
});

export const esqlToolCreator = (tool: EsqlToolCreateResponse): EsqlTool => {
  const executableTool: EsqlTool = {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    query: tool.query,
    params: tool.params,
    schema: esqlSchema,
    handler: async ({ params }, { esClient }) => {
      const client = esClient.asCurrentUser;
      const filledQuery = tool.query.replace(/\?(\w+)/g, (_, key) => {
        if (!(key in tool.params)) {
          throw new Error(
            `Error with query: Parameter ${key} not found in tool params. Available: ${Object.keys(
              tool.params
            ).join(', ')}`
          );
        }
        const value = params[key];
        if (value === undefined || value === null) {
          throw new Error(`Error with query: Parameter ${key} is required but was not provided`);
        }

        return typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
      });

      const response = await client.esql.query({
        query: filledQuery,
      });

      return response;
    },
    meta: tool.meta,
  };
  return executableTool;
};
