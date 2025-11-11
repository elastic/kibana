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

const githubSummarySchema = z.object({
  start: z
    .string()
    .describe(
      'ISO datetime string for the start time to fetch GitHub updates. If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  connectorId: z
    .string()
    .optional()
    .describe(
      'GitHub connector ID (currently not supported - no GitHub connector exists in Kibana Actions)'
    ),
  token: z
    .string()
    .optional()
    .describe(
      'GitHub Personal Access Token or OAuth token with repo scope. Optional if configured in kibana.dev.yml under catchupAgent.external.github.token'
    ),
  repo: z.string().optional().describe('Repository name (e.g., "kibana")'),
  owner: z.string().optional().describe('Repository owner (e.g., "elastic")'),
});

export const githubSummaryTool = (): BuiltinToolDefinition<typeof githubSummarySchema> => {
  return {
    id: 'hackathon.catchup.external.github',
    type: ToolType.builtin,
    description: `Summarizes pull requests, issues, and commits from GitHub since a given timestamp.

**Authentication:** GitHub Personal Access Token (PAT) or OAuth token with 'repo' scope is required.
The token can be provided either:
- Via 'token' parameter (for testing)
- Via configuration in kibana.dev.yml under 'catchupAgent.external.github.token' (recommended)

If not configured, you'll be prompted to add it to kibana.dev.yml.

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
Optionally specify 'repo' and 'owner' to scope to a specific repository (e.g., owner='elastic', repo='kibana').`,
    schema: githubSummarySchema,
    handler: async ({ start, connectorId, token, repo, owner }, { request, logger }) => {
      try {

        if (connectorId) {
          throw new Error(
            'GitHub connectorId is not currently supported. Please use "token" parameter or configure in kibana.dev.yml.'
          );
        }

        // Get token from config or parameter
        const { config } = getPluginServices();
        const githubToken = token || config.external?.github?.token;

        if (!githubToken) {
          throw new Error(
            `GitHub Personal Access Token or OAuth token is required. Please configure it in Kibana settings:
- For local development: Add to kibana.dev.yml under the key "catchupAgent.external.github.token"
- For production: Configure via Kibana Settings UI or kibana.yml under the key "catchupAgent.external.github.token"

Example for kibana.dev.yml:
catchupAgent:
  external:
    github:
      token: "your-github-personal-access-token"

Or provide it via the 'token' parameter. The token should have 'repo' scope for private repositories.`
          );
        }

        // Normalize date to current year if year is missing
        const normalizedStart = normalizeDateToCurrentYear(start);
        const startTimestamp = new Date(normalizedStart).getTime();
        if (isNaN(startTimestamp)) {
          throw new Error(`Invalid datetime format: ${start}. Expected ISO 8601 format.`);
        }

        // TODO: Full implementation would:
        // 1. Use token from config or parameter
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
                  'GitHub summary tool implementation pending. Will use GitHub API with token from config.',
                start: normalizedStart,
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
