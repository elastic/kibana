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
import { normalizeDateToCurrentYear } from '../utils/date_normalization';
import { getPluginServices } from '../../services/service_locator';

const gmailDigestSchema = z.object({
  start: z
    .string()
    .describe(
      'ISO datetime string for the start time to fetch Gmail messages. If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  token: z
    .string()
    .optional()
    .describe(
      'Gmail OAuth2 access token with gmail.readonly scope. Optional if configured in kibana.dev.yml under catchupAgent.external.gmail.token'
    ),
  connectorId: z
    .string()
    .optional()
    .describe(
      'Gmail connector ID (currently not supported - no Gmail API connector exists in Kibana Actions)'
    ),
  keywords: z
    .array(z.string())
    .optional()
    .describe('Keywords to filter emails (e.g., "incident", "alert", "case")'),
});

export const gmailDigestTool = (): BuiltinToolDefinition<typeof gmailDigestSchema> => {
  return {
    id: 'hackathon.catchup.external.gmail',
    type: ToolType.builtin,
    description: `Fetches and summarizes email conversations from Gmail since a given timestamp.

**USE THIS TOOL when the user asks about:**
- "Gmail", "my gmail", "latest emails", "recent emails", "email from Gmail"
- "what's in my inbox", "latest from Gmail", "recent Gmail messages"
- Any query specifically mentioning Gmail or email conversations

**DO NOT use this tool for:** General Elasticsearch index searches or queries about other data sources.

**Authentication:** Gmail OAuth2 access token with 'gmail.readonly' scope is required.
The token can be provided either:
- Via 'token' parameter (for testing)
- Via configuration in kibana.dev.yml under 'catchupAgent.external.gmail.token' (recommended)

If not configured, you'll be prompted to add it to kibana.dev.yml.

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
Optionally filters by keywords like "incident", "alert", or "case".`,
    schema: gmailDigestSchema,
    handler: async ({ start, token, connectorId, keywords }, { request, logger }) => {
      try {

        if (connectorId) {
          throw new Error(
            'Gmail connectorId is not currently supported. Please use "token" parameter or configure in kibana.dev.yml.'
          );
        }

        // Get token from config or parameter
        const { config } = getPluginServices();
        const gmailToken = token || config.external?.gmail?.token;

        if (!gmailToken) {
          throw new Error(
            `Gmail OAuth2 access token is required. Please configure it in Kibana settings:
- For local development: Add to kibana.dev.yml under the key "catchupAgent.external.gmail.token"
- For production: Configure via Kibana Settings UI or kibana.yml under the key "catchupAgent.external.gmail.token"

Example for kibana.dev.yml:
catchupAgent:
  external:
    gmail:
      token: "your-gmail-oauth2-access-token"

Or provide it via the 'token' parameter. The token should have 'gmail.readonly' scope.`
          );
        }

        // Normalize date to current year if year is missing
        const normalizedStart = normalizeDateToCurrentYear(start);
        const startDate = new Date(normalizedStart);
        if (isNaN(startDate.getTime())) {
          throw new Error(`Invalid datetime format: ${start}. Expected ISO 8601 format.`);
        }

        // TODO: Full implementation would:
        // 1. Use OAuth token from config or parameter
        // 2. Call Gmail API: users.messages.list with query filter (after:timestamp)
        // 3. Call Gmail API: users.messages.get for each message
        // 4. Filter by keywords in subject/body: "incident", "alert", "case"
        // 5. Return summarized conversations

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'Gmail digest tool implementation pending. Will use Gmail API with OAuth token from config.',
                start: normalizedStart,
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
