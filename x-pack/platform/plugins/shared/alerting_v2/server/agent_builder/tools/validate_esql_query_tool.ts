/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';

const validateEsqlQuerySchema = z.object({
  query: z.string().describe('The ES|QL query to validate.'),
});

export const validateEsqlQueryTool = (): BuiltinToolDefinition<typeof validateEsqlQuerySchema> => ({
  id: `${internalNamespaces.alertingV2}.validate_esql_query`,
  type: ToolType.builtin,
  description:
    'Validate an ES|QL query by running it with LIMIT 0 to check for syntax errors or missing fields without returning data.',
  tags: ['alerting'],
  schema: validateEsqlQuerySchema,
  handler: async ({ query }, { esClient }) => {
    const dryRunQuery = `${query} | LIMIT 0`;

    try {
      await esClient.asCurrentUser.transport.request({
        method: 'POST',
        path: '/_query',
        body: { query: dryRunQuery },
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              valid: true,
              message: 'Query is valid.',
            },
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              valid: false,
              message: `Query validation failed: ${errorMessage}`,
            },
          },
        ],
      };
    }
  },
});
