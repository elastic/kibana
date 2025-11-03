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

const slackDigestSchema = z.object({
  since: z.string().describe('ISO datetime string for the start time to fetch Slack messages'),
  connectorId: z.string().describe('Slack connector ID configured in Kibana'),
  keywords: z
    .array(z.string())
    .optional()
    .describe('Optional keywords to filter messages (e.g., user mentions, project names)'),
});

export const slackDigestTool = (): BuiltinToolDefinition<typeof slackDigestSchema> => {
  return {
    id: 'platform.catchup.external.slack',
    type: ToolType.builtin,
    description: `Fetches messages and threads from Slack since a given timestamp.
    
The 'since' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z').
The 'connectorId' should be a Slack connector configured in Kibana Actions.
Optionally filters by keywords for user mentions or project names.`,
    schema: slackDigestSchema,
    handler: async ({ since, connectorId, keywords }, { request, logger }) => {
      try {
        logger.debug(`slack digest tool called with since: ${since}, connectorId: ${connectorId}`);

        // TODO: Get connector secrets via Actions plugin
        // For MVP, this is a placeholder implementation
        // Full implementation would:
        // 1. Get actions client: actions.getActionsClientWithRequest(request)
        // 2. Get connector: actionsClient.get({ id: connectorId })
        // 3. Decrypt secrets via encrypted saved objects client
        // 4. Use Slack API token from secrets to make API calls

        // Placeholder: In a real implementation, we would:
        // - Call Slack Conversations API: conversations.history
        // - Filter by timestamp and keywords
        // - Return summarized threads

        const sinceTimestamp = new Date(since).getTime();
        if (isNaN(sinceTimestamp)) {
          throw new Error(`Invalid datetime format: ${since}. Expected ISO 8601 format.`);
        }

        // This is a placeholder - actual implementation would call Slack API
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'Slack digest tool requires connector secrets access. Full implementation pending.',
                connectorId,
                since,
                keywords: keywords || [],
                slack_threads: [],
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in slack digest tool: ${error}`);
        return {
          results: [createErrorResult(`Error fetching Slack digest: ${error}`)],
        };
      }
    },
    tags: ['external', 'slack'],
  };
};
