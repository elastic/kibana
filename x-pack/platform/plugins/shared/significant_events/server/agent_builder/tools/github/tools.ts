/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { ErrorResult, OtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { z } from '@kbn/zod/v4';
import {
  GITHUB_GET_COMMIT_TOOL_ID,
  GITHUB_GET_FILE_CONTENTS_TOOL_ID,
  GITHUB_GET_REPOSITORY_TREE_TOOL_ID,
  GITHUB_ISSUE_READ_TOOL_ID,
  GITHUB_LIST_REPOS_TOOL_ID,
  GITHUB_MCP_CONNECTOR_ID,
  GITHUB_PULL_REQUEST_READ_TOOL_ID,
  GITHUB_SEARCH_CODE_TOOL_ID,
  GITHUB_SEARCH_ISSUES_TOOL_ID,
  GITHUB_SEARCH_PULL_REQUESTS_TOOL_ID,
  GITHUB_SEARCH_REPOSITORIES_TOOL_ID,
} from './constants';
import {
  recordGithubSearchCodeCall,
  type GithubSearchPhase,
  type GithubSearchStatus,
} from './search_rate_tracker';

const searchCodeSchema = z.object({
  query: z.string().describe('GitHub code search query. Include repo:owner/repo.'),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  sort: z.string().optional(),
  phase: z.enum(['service-discovery', 'logging-sites']).optional(),
  serviceName: z.string().optional(),
});

const getCommitSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  sha: z
    .string()
    .describe(
      'Commit SHA, bare branch name, or bare tag name exactly as configured. Do not prepend refs/heads/ or refs/tags/.'
    ),
  detail: z.enum(['none', 'stats', 'full_patch']).optional().default('none'),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

const getRepositoryTreeSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  tree_sha: z.string().optional(),
  path_filter: z.string().optional(),
  recursive: z.boolean().optional().default(false),
});

const getFileContentsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  path: z.string().optional().default('/'),
  ref: z.string().optional(),
  sha: z.string().optional(),
});

const generalSearchSchema = z.object({
  query: z.string(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  sort: z.string().optional(),
});

const searchRepositoriesSchema = generalSearchSchema.extend({
  minimal_output: z.boolean().optional().default(true),
});

const repositoryScopedSearchSchema = generalSearchSchema.extend({
  owner: z.string().optional(),
  repo: z.string().optional(),
});

const issueReadSchema = z.object({
  method: z.enum(['get', 'get_comments', 'get_sub_issues', 'get_parent', 'get_labels']),
  owner: z.string(),
  repo: z.string(),
  issue_number: z.number().int().positive(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

const pullRequestReadSchema = z.object({
  method: z.enum([
    'get',
    'get_diff',
    'get_status',
    'get_files',
    'get_commits',
    'get_review_comments',
    'get_reviews',
    'get_comments',
    'get_check_runs',
  ]),
  owner: z.string(),
  repo: z.string(),
  pullNumber: z.number().int().positive(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  after: z.string().optional(),
});

const listReposSchema = z.object({});

const isRateLimited = (message: string): boolean =>
  /(?:rate.?limit|secondary rate|too many requests|status(?: code)?\s*429|http\s*429)/i.test(
    message
  );

const repositoryFromQuery = (query: string): string | undefined =>
  /(?:^|\s)repo:([^\s]+)/.exec(query)?.[1];

const executeMcpTool = async ({
  server,
  request,
  toolName,
  toolParams,
}: {
  server: StreamsServer;
  request: Parameters<StreamsServer['actions']['getActionsClientWithRequest']>[0];
  toolName: string;
  toolParams: Record<string, unknown>;
}): Promise<{ status: 'success' | 'error'; data: unknown; message?: string }> => {
  const actionsClient = await server.actions.getActionsClientWithRequest(request);
  const result = await actionsClient.execute({
    actionId: GITHUB_MCP_CONNECTOR_ID,
    params: {
      subAction: 'callTool',
      subActionParams: { name: toolName, arguments: toolParams },
    },
  });
  if (result.status === 'error') {
    return {
      status: 'error',
      data: undefined,
      message: result.serviceMessage ?? result.message ?? `GitHub MCP ${toolName} failed`,
    };
  }
  return { status: 'success', data: result.data };
};

const createMcpProxyTool = <T extends z.ZodObject<z.ZodRawShape>>({
  id,
  description,
  schema,
  toolName,
  server,
  logger,
}: {
  id: string;
  description: string;
  schema: T;
  toolName: string;
  server: StreamsServer;
  logger: Logger;
}): BuiltinToolDefinition<T, OtherResult | ErrorResult> => ({
  id,
  type: ToolType.builtin,
  description,
  schema,
  tags: ['github', 'mcp', 'significant_events', 'code_intelligence'],
  handler: async (params, context) => {
    const startedAt = Date.now();
    // Only searchCodeSchema declares the local-only measurement fields. They are
    // stripped generically so the remote MCP server never receives them.
    const { phase, serviceName, ...toolParams } = params as Record<string, unknown> & {
      phase?: GithubSearchPhase;
      serviceName?: string;
    };
    const query =
      toolName === 'search_code' && typeof toolParams.query === 'string'
        ? toolParams.query
        : undefined;
    try {
      const result = await executeMcpTool({
        server,
        request: context.request,
        toolName,
        toolParams,
      });
      if (result.status === 'error') {
        const message = result.message ?? `GitHub MCP ${toolName} failed`;
        if (query) {
          const status: GithubSearchStatus = isRateLimited(message) ? 'rate_limited' : 'error';
          recordGithubSearchCodeCall(context.spaceId, {
            timestamp: new Date().toISOString(),
            toolCallId: context.callContext.toolCallId,
            phase: phase ?? 'unknown',
            repository: repositoryFromQuery(query),
            serviceName,
            query,
            status,
            durationMs: Date.now() - startedAt,
          });
        }
        return { results: [{ type: ToolResultType.error, data: { message } }] };
      }
      if (query) {
        recordGithubSearchCodeCall(context.spaceId, {
          timestamp: new Date().toISOString(),
          toolCallId: context.callContext.toolCallId,
          phase: phase ?? 'unknown',
          repository: repositoryFromQuery(query),
          serviceName,
          query,
          status: 'success',
          durationMs: Date.now() - startedAt,
        });
      }
      return { results: [{ type: ToolResultType.other, data: { response: result.data } }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`GitHub MCP tool ${id} failed: ${message}`);
      if (query) {
        recordGithubSearchCodeCall(context.spaceId, {
          timestamp: new Date().toISOString(),
          toolCallId: context.callContext.toolCallId,
          phase: phase ?? 'unknown',
          repository: repositoryFromQuery(query),
          serviceName,
          query,
          status: isRateLimited(message) ? 'rate_limited' : 'error',
          durationMs: Date.now() - startedAt,
        });
      }
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `${message}. Configure connector "${GITHUB_MCP_CONNECTOR_ID}" with a GitHub bearer token in Connector settings.`,
            },
          },
        ],
      };
    }
  },
});

export const createGithubCodeResearchTools = ({
  server,
  logger,
}: {
  server: StreamsServer;
  logger: Logger;
}): StaticToolRegistration[] => [
  {
    id: GITHUB_LIST_REPOS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'List the GitHub repositories configured for this Code Intelligence proof of concept.',
    schema: listReposSchema,
    tags: ['github', 'significant_events', 'code_intelligence'],
    handler: async () => ({
      results: [
        {
          type: ToolResultType.other,
          data: {
            repositories: [
              {
                repository: 'open-telemetry/opentelemetry-demo',
                ref: '2.2.0',
              },
            ],
          },
        },
      ],
    }),
  },
  createMcpProxyTool({
    id: GITHUB_SEARCH_CODE_TOOL_ID,
    description:
      'Search code on GitHub. Use sparingly: this operation is limited to 10 requests per minute per API key. Always scope queries with repo:owner/repo and, for logging investigations, path:<service-root>.',
    schema: searchCodeSchema,
    toolName: 'search_code',
    server,
    logger,
  }),
  createMcpProxyTool({
    id: GITHUB_GET_COMMIT_TOOL_ID,
    description:
      'Resolve a GitHub commit, bare branch, or bare tag and return its immutable commit details. Pass configured refs exactly; never prepend refs/heads/ or refs/tags/.',
    schema: getCommitSchema,
    toolName: 'get_commit',
    server,
    logger,
  }),
  createMcpProxyTool({
    id: GITHUB_GET_REPOSITORY_TREE_TOOL_ID,
    description: 'Read a GitHub repository tree at an immutable commit SHA or ref.',
    schema: getRepositoryTreeSchema,
    toolName: 'get_repository_tree',
    server,
    logger,
  }),
  createMcpProxyTool({
    id: GITHUB_GET_FILE_CONTENTS_TOOL_ID,
    description: 'Read a GitHub file or directory at an immutable commit SHA.',
    schema: getFileContentsSchema,
    toolName: 'get_file_contents',
    server,
    logger,
  }),
  createMcpProxyTool({
    id: GITHUB_SEARCH_REPOSITORIES_TOOL_ID,
    description:
      'Find GitHub repositories by name, description, README, topics, language, owner, stars, or other repository metadata.',
    schema: searchRepositoriesSchema,
    toolName: 'search_repositories',
    server,
    logger,
  }),
  createMcpProxyTool({
    id: GITHUB_SEARCH_ISSUES_TOOL_ID,
    description: 'Search GitHub issues using issue search syntax.',
    schema: repositoryScopedSearchSchema,
    toolName: 'search_issues',
    server,
    logger,
  }),
  createMcpProxyTool({
    id: GITHUB_SEARCH_PULL_REQUESTS_TOOL_ID,
    description: 'Search GitHub pull requests using pull-request search syntax.',
    schema: repositoryScopedSearchSchema,
    toolName: 'search_pull_requests',
    server,
    logger,
  }),
  createMcpProxyTool({
    id: GITHUB_ISSUE_READ_TOOL_ID,
    description: 'Read GitHub issue details, comments, labels, parent, or sub-issues.',
    schema: issueReadSchema,
    toolName: 'issue_read',
    server,
    logger,
  }),
  createMcpProxyTool({
    id: GITHUB_PULL_REQUEST_READ_TOOL_ID,
    description:
      'Read GitHub pull-request details, diff, changed files, commits, reviews, comments, checks, or status.',
    schema: pullRequestReadSchema,
    toolName: 'pull_request_read',
    server,
    logger,
  }),
];
