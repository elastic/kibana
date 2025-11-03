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

const githubSummarySchema = z.object({
  since: z
    .string()
    .describe(
      'ISO datetime string for the start time to fetch GitHub updates. If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  connectorId: z
    .string()
    .optional()
    .describe('GitHub connector ID configured in Kibana (if using connector)'),
  token: z.string().optional().describe('GitHub personal access token (if not using connector)'),
  repo: z.string().optional().describe('Repository name (e.g., "kibana")'),
  owner: z.string().optional().describe('Repository owner (e.g., "elastic")'),
});

export const githubSummaryTool = (): BuiltinToolDefinition<typeof githubSummarySchema> => {
  return {
    id: 'platform.catchup.external.github',
    type: ToolType.builtin,
    description: `Summarizes pull requests, issues, and commits from GitHub since a given timestamp.
    
The 'since' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
Either 'connectorId' or 'token' must be provided for authentication.
Optionally specify 'repo' and 'owner' to scope to a specific repository.`,
    schema: githubSummarySchema,
    handler: async ({ since, connectorId, token, repo, owner }, { request, logger }) => {
      try {
        logger.debug(`github summary tool called with since: ${since}`);

        if (!connectorId && !token) {
          throw new Error('Either connectorId or token must be provided');
        }

        // Normalize date to current year if year is missing
        const normalizedSince = normalizeDateToCurrentYear(since);
        const sinceTimestamp = new Date(normalizedSince).getTime();
        if (isNaN(sinceTimestamp)) {
          throw new Error(`Invalid datetime format: ${since}. Expected ISO 8601 format.`);
        }

        // TODO: Full implementation would:
        // 1. Get connector secrets if connectorId provided
        // 2. Call GitHub REST API: GET /repos/{owner}/{repo}/pulls (merged)
        // 3. Call GitHub REST API: GET /repos/{owner}/{repo}/issues
        // 4. Filter by merged_at/updated_at > since
        // 5. Return summarized PRs and issues

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'GitHub summary tool requires connector secrets or token access. Full implementation pending.',
                since: normalizedSince,
                connectorId: connectorId || null,
                repo: repo || null,
                owner: owner || null,
                pull_requests: [],
                issues: [],
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in github summary tool: ${error}`);
        return {
          results: [createErrorResult(`Error fetching GitHub summary: ${error}`)],
        };
      }
    },
    tags: ['external', 'github'],
  };
};
