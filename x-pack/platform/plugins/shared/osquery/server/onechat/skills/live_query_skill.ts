/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { Skill } from '@kbn/onechat-common/skills';
import type { GetOsqueryAppContextFn } from './utils';
import { getOneChatContext } from './utils';
import { createActionHandler } from '../../handlers/action/create_action_handler';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { getUserInfo } from '../../lib/get_user_info';

const LIVE_QUERY_SKILL: Omit<Skill, 'tools'> = {
  namespace: 'osquery.live_query',
  name: 'Osquery Live Query',
  description: 'Run live osquery queries against agents',
  content: `# Osquery Live Query Guide

This skill provides knowledge about running live osquery queries against agents.

## Overview
Live queries allow you to execute osquery SQL queries against one or more agents in real-time. Results are returned immediately and can be used for investigation, monitoring, or compliance checks.

## Key Concepts

### Agent Selection
- **agent_ids**: Specific agent IDs to target
- **agent_all**: Run query on all agents (use with caution)
- **agent_platforms**: Filter by platform (windows, darwin, linux)
- **agent_policy_ids**: Filter by agent policy IDs

### Query Types
- **query**: Single osquery SQL query string
- **queries**: Array of queries (for multi-query execution)
- **saved_query_id**: Reference to a saved query
- **pack_id**: Reference to a pack containing queries

### Best Practices
1. **Scope queries appropriately**: Avoid running queries on all agents unless necessary
2. **Use timeouts**: Set reasonable timeouts to prevent long-running queries
3. **Test queries first**: Validate query syntax before running on production agents
4. **Monitor results**: Check query results for errors or unexpected data

## Usage Examples

### Run a simple query on specific agents
\`\`\`
tool("run_live_query", {
  query: "SELECT * FROM processes WHERE name = 'osqueryd'",
  agent_ids: ["agent-123", "agent-456"],
  timeout: 30
})
\`\`\`

### Run a saved query
\`\`\`
tool("run_live_query", {
  saved_query_id: "saved-query-uuid",
  agent_ids: ["agent-123"]
})
\`\`\`

### Run a pack query
\`\`\`
tool("run_live_query", {
  pack_id: "pack-uuid",
  agent_ids: ["agent-123"]
})
\`\`\`

## Important Notes
- Always specify agent selection (agent_ids, agent_all, agent_platforms, or agent_policy_ids)
- Queries must be valid osquery SQL
- Results are returned asynchronously - use get_live_query_results to fetch them
- Action ID is returned and can be used to track query execution
`,
};

/**
 * Creates a LangChain tool for running live osquery queries
 */
const createRunLiveQueryTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({ query, queries, saved_query_id, pack_id, agent_ids, agent_all, agent_platforms, agent_policy_ids, timeout, ecs_mapping }, config) => {
      const onechatContext = getOneChatContext(config);
      if (!onechatContext) {
        throw new Error('OneChat context not available');
      }

      const osqueryContext = getOsqueryContext();
      if (!osqueryContext) {
        throw new Error('Osquery context not available');
      }

      const { request, spaceId, logger } = onechatContext;

      // Check capabilities
      const [coreStart] = await osqueryContext.getStartServices();
      const {
        osquery: { writeLiveQueries, runSavedQueries },
      } = await coreStart.capabilities.resolveCapabilities(request, {
        capabilityPath: 'osquery.*',
      });

      const isInvalid = !(
        writeLiveQueries ||
        (runSavedQueries && (saved_query_id || pack_id))
      );

      if (isInvalid) {
        throw new Error('Insufficient permissions to run live queries');
      }

      // Get current user
      const currentUser = await getUserInfo({
        request,
        security: osqueryContext.security,
        logger: osqueryContext.logFactory.get('live_query'),
      });
      const username = currentUser?.username ?? undefined;

      // Get active space
      const space = await osqueryContext.service.getActiveSpace(request);
      const spaceIdValue = space?.id ?? spaceId ?? DEFAULT_SPACE_ID;

      // Prepare parameters
      const params: any = {
        agent_ids: agent_ids,
        agent_all: agent_all,
        agent_platforms: agent_platforms,
        agent_policy_ids: agent_policy_ids,
        timeout: timeout,
        ecs_mapping: ecs_mapping,
      };

      if (query) {
        params.query = query;
      }
      if (queries) {
        params.queries = queries;
      }
      if (saved_query_id) {
        params.saved_query_id = saved_query_id;
      }
      if (pack_id) {
        params.pack_id = pack_id;
      }

      try {
        const { response: osqueryAction } = await createActionHandler(
          osqueryContext,
          params,
          {
            metadata: { currentUser: username },
            space: { id: spaceIdValue },
          }
        );

        return JSON.stringify({
          action_id: osqueryAction.action_id,
          agents: osqueryAction.agents,
          message: `Live query executed successfully. Action ID: ${osqueryAction.action_id}`,
        });
      } catch (error: any) {
        throw new Error(`Failed to execute live query: ${error.message}`);
      }
    },
    {
      name: 'run_live_query',
      description: 'Run a live osquery query against one or more agents. Returns an action ID that can be used to fetch results.',
      schema: z.object({
        query: z.string().optional().describe('Single osquery SQL query string'),
        queries: z.array(z.object({
          query: z.string(),
          id: z.string().optional(),
          interval: z.number().optional(),
          timeout: z.number().optional(),
          snapshot: z.boolean().optional(),
          removed: z.boolean().optional(),
          ecs_mapping: z.record(z.any()).optional(),
        })).optional().describe('Array of queries to execute'),
        saved_query_id: z.string().optional().describe('ID of a saved query to run'),
        pack_id: z.string().optional().describe('ID of a pack to run'),
        agent_ids: z.array(z.string()).optional().describe('Specific agent IDs to target'),
        agent_all: z.boolean().optional().describe('Run query on all agents (use with caution)'),
        agent_platforms: z.array(z.string()).optional().describe('Filter by platform (windows, darwin, linux)'),
        agent_policy_ids: z.array(z.string()).optional().describe('Filter by agent policy IDs'),
        timeout: z.number().optional().describe('Query timeout in seconds'),
        ecs_mapping: z.record(z.any()).optional().describe('ECS field mapping for query results'),
      }),
    }
  );
};

export const getLiveQuerySkill = (getOsqueryContext: GetOsqueryAppContextFn): Skill => {
  return {
    ...LIVE_QUERY_SKILL,
    tools: [createRunLiveQueryTool(getOsqueryContext)],
  };
};





