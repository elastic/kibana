/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { createErrorResult } from '@kbn/onechat-server';

const gmailDigestSchema = z.object({
  since: z.string().describe('ISO datetime string for the start time to fetch Gmail messages'),
  connectorId: z
    .string()
    .optional()
    .describe('Gmail connector ID configured in Kibana (if using connector)'),
  keywords: z
    .array(z.string())
    .optional()
    .describe('Keywords to filter emails (e.g., "incident", "alert", "case")'),
});

export const gmailDigestTool = (): BuiltinToolDefinition<typeof gmailDigestSchema> => {
  return {
    id: 'platform.catchup.external.gmail',
    type: ToolType.builtin,
    description: `Summarizes email conversations from Gmail since a given timestamp.
    
The 'since' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z').
The 'connectorId' should be a Gmail connector configured in Kibana Actions.
Optionally filters by keywords like "incident", "alert", or "case".`,
    schema: gmailDigestSchema,
    handler: async ({ since, connectorId, keywords }, { request, logger }) => {
      try {
        logger.debug(`gmail digest tool called with since: ${since}, connectorId: ${connectorId}`);

        const sinceTimestamp = new Date(since).getTime();
        if (isNaN(sinceTimestamp)) {
          throw new Error(`Invalid datetime format: ${since}. Expected ISO 8601 format.`);
        }

        // TODO: Full implementation would:
        // 1. Get connector secrets via Actions plugin
        // 2. Use OAuth credentials from secrets
        // 3. Call Gmail API: messages.list with query filter
        // 4. Call Gmail API: messages.get for content
        // 5. Filter by keywords: "incident", "alert", "case"
        // 6. Return summarized conversations

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'Gmail digest tool requires connector secrets access. Full implementation pending.',
                connectorId: connectorId || null,
                since,
                keywords: keywords || ['incident', 'alert', 'case'],
                emails: [],
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in gmail digest tool: ${error}`);
        return {
          results: [createErrorResult(`Error fetching Gmail digest: ${error}`)],
        };
      }
    },
    tags: ['external', 'gmail'],
  };
};
