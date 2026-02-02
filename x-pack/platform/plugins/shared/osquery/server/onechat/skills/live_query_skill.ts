/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { Skill } from '@kbn/agent-builder-common/skills';
import type { GetOsqueryAppContextFn } from './utils';
import { getOneChatContext } from './utils';
import { createActionHandler } from '../../handlers/action/create_action_handler';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { getUserInfo } from '../../lib/get_user_info';
import { lastValueFrom } from 'rxjs';
import { OSQUERY_INTEGRATION_NAME } from '../../../common/constants';
import { Direction, OsqueryQueries } from '../../../common/search_strategy';
import type {
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
  ResultsRequestOptions,
  ResultsStrategyResponse,
  ActionResultsRequestOptions,
  ActionResultsStrategyResponse,
} from '../../../common/search_strategy';
import { generateTablePaginationOptions } from '../../../common/utils/build_query';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const osquerySchema = require('../../../public/common/schemas/osquery/v5.20.0.json');

// Constants for polling configuration
const POLL_INTERVAL_MS = 20000; // 5 seconds between polls
const MAX_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes maximum wait time

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const LIVE_QUERY_SKILL: Omit<Skill, 'tools'> = {
  namespace: 'osquery.live_query',
  name: 'Osquery Live Query',
  description: 'Run live osquery queries, fetch results, and browse table schemas',
  content: `# Osquery Live Query Guide

This skill provides tools for running live osquery queries against agents, fetching results, and browsing table schemas.

## Complete Query Workflow

**You MUST follow this complete workflow:**

### Step 1: MANDATORY - Get Agent IDs First
\`\`\`
get_agents({ hostname: "server-name" })  // Search by hostname
get_agents({})  // List all available agents
\`\`\`
- **ALWAYS use agent IDs, never agent names/hostnames in queries**
- Use \`get_agents\` to look up the agent ID by hostname
- The response includes \`id\` (agent ID), \`local_metadata.host.hostname\`, and \`status\`
- **Only target agents with status "online"** - offline agents won't respond

### Step 2: MANDATORY - Check Schema
\`\`\`
get_schema({ table: "processes" })
\`\`\`
- **ALWAYS verify the table exists and get exact column names BEFORE running queries**
- Use ONLY columns returned by get_schema
- This prevents "no such column" errors!

### Step 3: Run the Query
\`\`\`
run_live_query({ query: "SELECT pid, name FROM processes", agent_ids: ["<agent_id>"] })
\`\`\`
- **Use the agent ID from step 1, NOT the hostname**
- Returns a response with:
  - \`action_id\`: The parent action ID
  - \`queries\`: Array with per-query action IDs - **USE THESE for fetching results!**
  - \`agents\`: List of targeted agents
- Results are collected asynchronously from agents

### Step 4: MANDATORY - Fetch Results (NEVER SKIP!)
\`\`\`
// Use the per-query action_id from queries[].action_id, NOT the parent action_id!
// ALWAYS pass agentCount from the run_live_query response for proper polling!
get_live_query_results({ actionId: "<queries[0].action_id>", agentCount: <queries[0].agent_count> })
\`\`\`
- **CRITICAL: Use \`queries[].action_id\` from run_live_query response, NOT the parent \`action_id\`**
- **CRITICAL: Pass \`agentCount\` from the response - this is required for proper completion detection!**
- **You MUST call this to get actual query data**
- **The tool automatically waits up to 5 minutes for all agents to respond** - no manual retry needed!
- Check the **status** field in the response:
  - \`completed\` → All agents responded. Results are ready to analyze.
  - \`error\` → Query completed but some agents failed. Check the \`errors\` array for details.
  - \`timeout\` → Waited 5 minutes but some agents are still offline/unresponsive.

### Step 5: Analyze Results
Only after fetching actual results, analyze and report findings.

## Available Tools

### get_agents
List or search for osquery-enabled agents.
- Search by hostname: \`get_agents({ hostname: "server-name" })\`
- Search by agent ID: \`get_agents({ agentId: "abc-123" })\`
- List all agents: \`get_agents({})\`
- Returns: agent ID, hostname, status (online/offline), platform, policy

### get_schema
Browse osquery table schemas.
- Pass null/undefined: List all available tables
- Pass table name: Get column definitions for that table

### run_live_query
Execute a live osquery SQL query against agents.
- **Requires agent IDs (not hostnames)** - use get_agents first!
- Returns: \`action_id\` (parent), \`queries\` array (with per-query action_ids), \`agents\`
- **Use \`queries[].action_id\` for fetching results, NOT the parent \`action_id\`**
- Validates agents exist before running

### get_live_query_results
Fetch results from a live query execution.
- **IMPORTANT: Use \`queries[].action_id\` from run_live_query, NOT the parent action_id**
- **IMPORTANT: Pass \`agentCount\` from run_live_query response for proper completion detection**
- Automatically polls for up to 5 minutes
- Returns actual query data with rows and columns
- Includes error messages from failed queries

### get_action_results
Get aggregated execution status across agents.
- Returns success/failure/pending counts

## CRITICAL: Agent ID vs Hostname

**WRONG - Using hostname:**
\`\`\`
run_live_query({ query: "SELECT * FROM processes", agent_ids: ["my-server-hostname"] })  // WRONG!
\`\`\`

**CORRECT - Using agent ID:**
\`\`\`
// First, get the agent ID
get_agents({ hostname: "my-server-hostname" })
// Returns: { agents: [{ id: "abc-123-def", local_metadata: { host: { hostname: "my-server-hostname" } }, status: "online" }] }

// Then use the ID
run_live_query({ query: "SELECT * FROM processes", agent_ids: ["abc-123-def"] })  // CORRECT!
\`\`\`

## Handling Query Errors

If \`get_live_query_results\` returns errors like "no such column: X":
1. The query syntax was correct but referenced a non-existent column
2. **Use get_schema to verify the correct column names**
3. Fix the query and retry

Common error types:
- \`no such column: X\` - Column doesn't exist, use get_schema to find valid columns
- \`no such table: X\` - Table doesn't exist, use get_schema to list tables
- \`query failed, code: 1\` - Syntax error or invalid reference
- \`Agent not found\` - The agent ID doesn't exist, use get_agents to find valid IDs

## Agent Selection Options

- **agent_ids**: Specific agent IDs to target (preferred - use get_agents to find IDs)
- **agent_all**: Run query on all agents (use with caution)
- **agent_platforms**: Filter by platform (windows, darwin, linux)
- **agent_policy_ids**: Filter by agent policy IDs

## Common Tables

- **processes**: Running processes
- **process_open_sockets**: Network connections by process
- **listening_ports**: Open ports
- **crontab**, **systemd_units**: Persistence mechanisms
- **elastic_browser_history**: Browser history
- **users**, **logged_in_users**: User activity
- **file**: File metadata

## Best Practices
1. **ALWAYS get agent IDs first**: Use get_agents to find agent IDs by hostname
2. **ALWAYS check schema**: Use get_schema to verify tables and columns BEFORE running queries
3. **ALWAYS fetch results**: Call get_live_query_results after running a query
4. **Check agent status**: Only target online agents
5. **Check for errors**: If results show failed > 0, check the errors array
6. **Scope queries appropriately**: Avoid running queries on all agents unless necessary

## Important Notes
- **NEVER use hostnames as agent_ids** - always look up the agent ID first
- **ALWAYS call get_agents to verify agent exists** before running queries
- **ALWAYS call get_schema before running queries** to verify table/column names
- **ALWAYS call get_live_query_results after run_live_query** to get actual data
- run_live_query returns action_id, NOT results
`,
};

/**
 * Creates a LangChain tool for listing/searching osquery-enabled agents.
 * @internal
 */
const createGetAgentsTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({ hostname, agentId, status, platform, perPage = 100 }, config) => {
      const onechatContext = getOneChatContext(config);
      if (!onechatContext) {
        throw new Error('OneChat context not available');
      }

      const osqueryContext = getOsqueryContext();
      if (!osqueryContext) {
        throw new Error('Osquery context not available');
      }

      const { request } = onechatContext;
      const space = await osqueryContext.service.getActiveSpace(request);
      const spaceId = space?.id ?? DEFAULT_SPACE_ID;

      const agentService = osqueryContext.service.getAgentService();
      if (!agentService) {
        throw new Error('Agent service not available');
      }

      // Build kuery filter
      const kueryParts: string[] = [];

      if (hostname) {
        // Search by hostname (partial match)
        kueryParts.push(`local_metadata.host.hostname:*${hostname}*`);
      }

      if (agentId) {
        // Search by specific agent ID
        kueryParts.push(`_id:"${agentId}"`);
      }

      if (status) {
        kueryParts.push(`status:"${status}"`);
      }

      if (platform) {
        kueryParts.push(`local_metadata.os.platform:"${platform}"`);
      }

      const kuery = kueryParts.length > 0 ? kueryParts.join(' AND ') : undefined;

      try {
        const result = await agentService
          .asInternalScopedUser(spaceId)
          .listAgents({
            perPage: Math.min(perPage, 100),
            kuery,
            showInactive: false,
          });

        const agents = result.agents.map((agent) => ({
          id: agent.id,
          hostname: agent.local_metadata?.host?.hostname ?? 'unknown',
          status: agent.status,
          platform: agent.local_metadata?.os?.platform ?? 'unknown',
          policy_id: agent.policy_id,
          last_checkin: agent.last_checkin,
        }));

        return JSON.stringify({
          total: result.total,
          agents,
          message: agents.length > 0
            ? `Found ${agents.length} agent(s). Use the 'id' field when running queries (not hostname).`
            : 'No agents found matching the criteria.',
        });
      } catch (error: any) {
        throw new Error(`Failed to fetch agents: ${error.message}`);
      }
    },
    {
      name: 'get_agents',
      description: 'List or search for osquery-enabled agents. Use this to find agent IDs by hostname before running queries. IMPORTANT: run_live_query requires agent IDs, not hostnames.',
      schema: z.object({
        hostname: z.string().optional().describe('Search by hostname (partial match supported)'),
        agentId: z.string().optional().describe('Search by specific agent ID'),
        status: z.enum(['online', 'offline', 'inactive', 'unenrolling']).optional().describe('Filter by agent status (default: all)'),
        platform: z.enum(['windows', 'darwin', 'linux']).optional().describe('Filter by platform'),
        perPage: z.number().optional().describe('Number of results to return (default: 100, max: 100)'),
      }),
    }
  );
};

/**
 * Creates a LangChain tool for browsing osquery table schemas.
 * @internal
 */
const createGetSchemaTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({ table }, config) => {
      const onechatContext = getOneChatContext(config);
      if (!onechatContext) {
        throw new Error('OneChat context not available');
      }

      if (!table) {
        // Return list of all tables
        const tables = osquerySchema.map((t: any) => ({
          name: t.name,
          description: t.description,
          columns_count: t.columns?.length ?? 0,
        }));
        return JSON.stringify({ tables, total: tables.length });
      }

      // Return schema for specific table
      const tableSchema = osquerySchema.find((t: any) => t.name === table);
      if (!tableSchema) {
        throw new Error(`Table "${table}" not found in osquery schema`);
      }

      return JSON.stringify({
        table: tableSchema.name,
        description: tableSchema.description,
        columns: tableSchema.columns?.map((col: any) => ({
          name: col.name,
          type: col.type,
          description: col.description,
        })) ?? [],
      });
    },
    {
      name: 'get_schema',
      description: 'Get osquery table schema. Pass null or omit table to list all tables.',
      schema: z.object({
        table: z.string().nullable().optional().describe('Table name to get schema for. Omit or pass null to list all tables.'),
      }),
    }
  );
};

/**
 * Creates a LangChain tool for running live osquery queries.
 * @internal
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

      const { request, spaceId } = onechatContext;

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

      // Validate agent_ids if provided (not using agent_all, agent_platforms, or agent_policy_ids)
      if (agent_ids && agent_ids.length > 0 && !agent_all && !agent_platforms?.length && !agent_policy_ids?.length) {
        const agentService = osqueryContext.service.getAgentService();
        if (agentService) {
          try {
            // Look up agents by IDs to validate they exist
            const agentIdFilter = agent_ids.map((id) => `_id:"${id}"`).join(' OR ');
            const result = await agentService
              .asInternalScopedUser(spaceIdValue)
              .listAgents({
                perPage: agent_ids.length,
                kuery: agentIdFilter,
                showInactive: true,
              });

            const foundIds = new Set(result.agents.map((a) => a.id));
            const notFoundIds = agent_ids.filter((id) => !foundIds.has(id));

            if (notFoundIds.length > 0) {
              // Check if these look like hostnames instead of agent IDs
              const looksLikeHostname = notFoundIds.some((id) =>
                !id.includes('-') || id.length < 30 || /^[a-zA-Z]/.test(id)
              );

              if (looksLikeHostname) {
                throw new Error(
                  `Agent ID(s) not found: ${notFoundIds.join(', ')}. ` +
                  `These look like hostnames, not agent IDs. ` +
                  `Use get_agents({ hostname: "..." }) to find the correct agent ID first.`
                );
              }

              throw new Error(
                `Agent ID(s) not found: ${notFoundIds.join(', ')}. ` +
                `Use get_agents() to find valid agent IDs.`
              );
            }

            // Check for offline agents
            const offlineAgents = result.agents.filter((a) => a.status !== 'online');
            if (offlineAgents.length > 0) {
              const offlineInfo = offlineAgents.map((a) => `${a.id} (${a.local_metadata?.host?.hostname ?? 'unknown'}: ${a.status})`);
              osqueryContext.logFactory.get('live_query').error(
                `Some targeted agents are not online: ${offlineInfo.join(', ')}. Query will be sent but may not receive responses.`
              );
            }
          } catch (error: any) {
            if (error.message.includes('Agent ID(s) not found')) {
              throw error;
            }
            // Log but don't block on validation errors
            osqueryContext.logFactory.get('live_query').error(
              `Could not validate agent IDs: ${error.message}`
            );
          }
        }
      }

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

        // Extract per-query action_ids - these are needed to fetch results
        const agentCount = osqueryAction.agents?.length ?? 0;
        const queryActionIds = osqueryAction.queries?.map((q: { action_id: string; id?: string; query?: string; agents?: string[] }) => ({
          action_id: q.action_id,
          query_id: q.id,
          query: q.query,
          agent_count: q.agents?.length ?? agentCount,
        })) ?? [];

        // For single query, provide the query action_id directly
        const primaryQueryActionId = queryActionIds.length === 1 ? queryActionIds[0].action_id : null;
        const primaryAgentCount = queryActionIds.length === 1 ? queryActionIds[0].agent_count : agentCount;

        return JSON.stringify({
          action_id: osqueryAction.action_id,
          agents: osqueryAction.agents,
          agent_count: agentCount,
          queries: queryActionIds,
          message: `Live query dispatched successfully to ${agentCount} agent(s).`,
          next_step: primaryQueryActionId
            ? `IMPORTANT: You MUST now call get_live_query_results with actionId "${primaryQueryActionId}" and agentCount ${primaryAgentCount} to fetch the actual results. Do NOT conclude your investigation without fetching and analyzing the results.`
            : `IMPORTANT: This dispatched ${queryActionIds.length} queries to ${agentCount} agent(s). You MUST call get_live_query_results for each query action_id (with agentCount) to fetch results.`,
          error_handling: `If the results show errors (failed > 0), check the errors array. For "no such column" errors, use get_schema to verify the correct column names and retry with the correct query.`,
        });
      } catch (error: any) {
        throw new Error(`Failed to execute live query: ${error.message}`);
      }
    },
    {
      name: 'run_live_query',
      description: 'Run a live osquery query against one or more agents. IMPORTANT: agent_ids must be actual agent IDs (UUIDs), not hostnames. Use get_agents() first to find agent IDs by hostname. Returns an action ID that can be used to fetch results.',
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
        agent_ids: z.array(z.string()).optional().describe('Agent IDs (UUIDs) to target. Use get_agents() to find IDs by hostname. Do NOT pass hostnames here.'),
        agent_all: z.boolean().optional().describe('Run query on all agents (use with caution)'),
        agent_platforms: z.array(z.string()).optional().describe('Filter by platform (windows, darwin, linux)'),
        agent_policy_ids: z.array(z.string()).optional().describe('Filter by agent policy IDs'),
        timeout: z.number().optional().describe('Query timeout in seconds'),
        ecs_mapping: z.record(z.any()).optional().describe('ECS field mapping for query results'),
      }),
    }
  );
};

/**
 * Creates a LangChain tool for fetching live query results by action ID.
 * This tool automatically polls for results until complete or timeout (5 minutes).
 *
 * IMPORTANT: The actionId must be the per-query action_id (from queries[].action_id),
 * NOT the parent live query action_id. The run_live_query tool returns these in the
 * queries array.
 *
 * @internal
 */
const createGetLiveQueryResultsTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({ actionId, agentCount, page, pageSize, sort, sortOrder, kuery, startDate, waitForResults = true }, config) => {
      const onechatContext = getOneChatContext(config);
      if (!onechatContext) {
        throw new Error('OneChat context not available');
      }

      const osqueryContext = getOsqueryContext();
      if (!osqueryContext) {
        throw new Error('Osquery context not available');
      }

      const { request } = onechatContext;
      const logger = osqueryContext.logFactory.get('get_live_query_results');

      const [, depsStart] = await osqueryContext.getStartServices();

      let integrationNamespaces: Record<string, string[]> = {};

      if (osqueryContext?.service?.getIntegrationNamespaces) {
        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );
        integrationNamespaces = await osqueryContext.service.getIntegrationNamespaces(
          [OSQUERY_INTEGRATION_NAME],
          spaceScopedClient,
          logger
        );
      }

      const scopedSearch = depsStart.data.search.asScoped(request);

      const osqueryNamespaces = integrationNamespaces[OSQUERY_INTEGRATION_NAME];
      const namespacesOrUndefined =
        osqueryNamespaces && osqueryNamespaces.length > 0 ? osqueryNamespaces : undefined;

      // This follows the same logic as get_live_query_results_route.ts:
      // - actionId is the per-query action_id (queries[].action_id)
      // - We query results using this action_id
      // - We get action responses to determine completion status

      const fetchResults = async () => {
        // Get action responses (status) for this specific query action_id
        // This matches getActionResponses from routes/live_query/utils.ts
        const actionResultsRes = await lastValueFrom(
          scopedSearch.search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
            {
              actionId: actionId,
              factoryQueryType: OsqueryQueries.actionResults,
              kuery: kuery ?? '',
              pagination: generateTablePaginationOptions(0, 1000),
              sort: {
                direction: Direction.desc,
                field: '@timestamp',
              },
              integrationNamespaces: namespacesOrUndefined,
            },
            { strategy: 'osquerySearchStrategy' }
          )
        );

        // Parse aggregations (same as utils.ts getActionResponses)
        const aggs = actionResultsRes.rawResponse?.aggregations as {
          aggs?: {
            responses_by_action_id?: {
              doc_count?: number;
              rows_count?: { value?: number };
              responses?: { buckets?: Array<{ key: string; doc_count: number }> };
            };
          };
        } | undefined;
        const responseAgg = aggs?.aggs?.responses_by_action_id;
        const totalResponded = responseAgg?.doc_count ?? 0;
        const totalRowCount = responseAgg?.rows_count?.value ?? 0;
        const aggsBuckets = responseAgg?.responses?.buckets;
        const successful = aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0;
        const failed = aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0;

        // Get actual results data
        const res = await lastValueFrom(
          scopedSearch.search<ResultsRequestOptions, ResultsStrategyResponse>(
            {
              actionId: actionId,
              factoryQueryType: OsqueryQueries.results,
              kuery: kuery,
              startDate: startDate,
              pagination: generateTablePaginationOptions(page ?? 0, pageSize ?? 100),
              sort: [
                {
                  direction: sortOrder ?? Direction.desc,
                  field: sort ?? '@timestamp',
                },
              ],
              integrationNamespaces: namespacesOrUndefined,
            },
            { strategy: 'osquerySearchStrategy' }
          )
        );

        const hasQueryResults = res.edges && res.edges.length > 0;

        // Determine expected agent count and pending
        // IMPORTANT: If agentCount is not provided, we can't determine completion by pending count
        // We must wait for actual results in that case
        const expectedAgents = agentCount ?? 0;
        const pending = expectedAgents > 0 ? Math.max(0, expectedAgents - totalResponded) : 0;

        // Completion logic:
        // 1. If we know the agent count: complete when all agents responded (pending === 0)
        // 2. If we have actual query results: complete
        // 3. If we don't know agent count and no results yet: NOT complete (keep polling)
        let isCompleted = false;
        if (expectedAgents > 0 && pending === 0) {
          // All expected agents responded
          isCompleted = true;
        } else if (expectedAgents === 0 && totalResponded > 0 && (successful > 0 || failed > 0)) {
          // No expected count provided, but we got responses with success/error status
          isCompleted = true;
        }
        // Otherwise: not complete, keep polling

        return {
          res,
          actionResultsRes,
          agentsCount: expectedAgents > 0 ? expectedAgents : totalResponded,
          totalResponded,
          totalRowCount,
          successful,
          failed,
          pending,
          isCompleted,
          hasQueryResults,
        };
      };

      const startTime = Date.now();
      let pollCount = 0;
      let lastResult: Awaited<ReturnType<typeof fetchResults>>;

      try {
        lastResult = await fetchResults();
      } catch (error) {
        logger.error(
          `Initial fetch failed for action ${actionId}: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }

      while (waitForResults && !lastResult.isCompleted && (Date.now() - startTime) < MAX_POLL_DURATION_MS) {
        pollCount++;
        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        const { pending, agentsCount, totalResponded } = lastResult;

        logger.debug(
          `[Poll ${pollCount}] Waiting for results... ${totalResponded}/${agentsCount} agents responded, ${pending} pending, hasResults: ${lastResult.hasQueryResults}. Elapsed: ${elapsedSeconds}s`
        );

        await sleep(POLL_INTERVAL_MS);

        try {
          lastResult = await fetchResults();
        } catch (error) {
          logger.error(
            `Poll ${pollCount} failed for action ${actionId}: ${error instanceof Error ? error.message : String(error)}`
          );
          break;
        }
      }

      const {
        res,
        actionResultsRes,
        agentsCount,
        totalResponded,
        totalRowCount,
        successful,
        failed,
        pending,
        isCompleted,
        hasQueryResults,
      } = lastResult;

      const completionReason =
        (agentsCount > 0 && pending === 0) ? 'all_agents_responded' :
          hasQueryResults ? 'has_query_results' :
            successful > 0 ? 'successful_responses' :
              (Date.now() - startTime) >= MAX_POLL_DURATION_MS ? 'timeout' : 'unknown';

      logger.debug(
        `Polling ended after ${pollCount} polls, ${Math.round((Date.now() - startTime) / 1000)}s. ` +
        `Reason: ${completionReason}. ` +
        `Stats: agentsCount=${agentsCount}, totalResponded=${totalResponded}, successful=${successful}, ` +
        `failed=${failed}, pending=${pending}, hasQueryResults=${hasQueryResults}, isCompleted=${isCompleted}`
      );

      const aggregations = {
        totalRowCount,
        totalResponded,
        successful,
        failed,
        pending,
        agentsCount,
        hasQueryResults,
      };

      const errors: Array<{ agent_id: string; error: string }> = [];
      if (actionResultsRes.edges && actionResultsRes.edges.length > 0) {
        for (const edge of actionResultsRes.edges) {
          const source = edge._source as Record<string, unknown> | undefined;
          const fields = edge.fields as Record<string, unknown[]> | undefined;

          const errorFromSource = source?.error as string | undefined;
          const errorFromFields = fields?.error?.[0] as string | undefined;
          const errorFromKeyword = fields?.['error.keyword']?.[0] as string | undefined;
          const actionResponse = source?.action_response as { osquery?: { error?: string } } | undefined;
          const errorFromActionResponse = actionResponse?.osquery?.error;

          const errorMsg = errorFromSource || errorFromFields || errorFromKeyword || errorFromActionResponse;

          if (errorMsg) {
            const agentId =
              (source?.agent_id as string) ||
              (fields?.agent_id?.[0] as string) ||
              (fields?.['agent.id']?.[0] as string) ||
              (source?.agent as { id?: string })?.id ||
              'unknown';
            errors.push({ agent_id: agentId, error: errorMsg });
          }
        }
      }

      const hasErrors = failed > 0 || errors.length > 0;
      let status: 'running' | 'completed' | 'error' | 'timeout';
      if (isCompleted) {
        status = hasErrors ? 'error' : 'completed';
      } else if ((Date.now() - startTime) >= MAX_POLL_DURATION_MS) {
        status = 'timeout';
      } else {
        status = 'running';
      }

      const elapsedMs = Date.now() - startTime;

      const response: {
        data: ResultsStrategyResponse;
        aggregations: typeof aggregations;
        status: typeof status;
        pollInfo: { pollCount: number; elapsedMs: number; maxWaitMs: number };
        errors?: typeof errors;
        warning?: string;
      } = {
        data: res,
        aggregations,
        status,
        pollInfo: {
          pollCount,
          elapsedMs,
          maxWaitMs: MAX_POLL_DURATION_MS,
        },
      };

      if (status === 'timeout') {
        response.warning = `Query timed out after ${Math.round(elapsedMs / 1000)} seconds. ${pending} of ${agentsCount} agent(s) still haven't responded. Some agents may be offline or slow to respond.`;
      } else if (errors.length > 0) {
        response.errors = errors;
        response.warning = `Query failed on ${errors.length} agent(s). Check the errors array for details. Common causes include invalid column names - use get_schema to verify table/column names before retrying.`;
      } else if (failed > 0) {
        response.warning = `Query failed on ${failed} agent(s). Check the errors array for details.`;
      }

      return JSON.stringify(response);
    },
    {
      name: 'get_live_query_results',
      description: 'Get results from a live osquery query action. IMPORTANT: Use the per-query action_id from queries[].action_id (returned by run_live_query), NOT the parent action_id. IMPORTANT: Always pass agentCount for proper completion detection. This tool automatically waits and polls for up to 5 minutes until all agents have responded.',
      schema: z.object({
        actionId: z.string().describe('The per-query action ID from queries[].action_id (returned by run_live_query). Do NOT use the parent action_id.'),
        agentCount: z.number().describe('Number of agents from run_live_query response (queries[].agent_count or agent_count). REQUIRED for proper completion detection - without it, the tool cannot know when all agents have responded.'),
        page: z.number().optional().describe('Page number (default: 0)'),
        pageSize: z.number().optional().describe('Number of results per page (default: 100)'),
        sort: z.string().optional().describe('Field to sort by (default: @timestamp)'),
        sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)'),
        kuery: z.string().optional().describe('KQL query to filter results'),
        startDate: z.string().optional().describe('Start date for filtering results'),
        waitForResults: z.boolean().optional().describe('Whether to wait and poll for results until complete (default: true). Set to false to get immediate snapshot.'),
      }),
    }
  );
};

/**
 * Creates a LangChain tool for fetching aggregated action results across agents.
 * @internal
 */
const createGetActionResultsTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({ actionId, agentIds, page, pageSize, sort, sortOrder, kuery, startDate }, config) => {
      const onechatContext = getOneChatContext(config);
      if (!onechatContext) {
        throw new Error('OneChat context not available');
      }

      const osqueryContext = getOsqueryContext();
      if (!osqueryContext) {
        throw new Error('Osquery context not available');
      }

      const { request } = onechatContext;
      const [, depsStart] = await osqueryContext.getStartServices();

      let integrationNamespaces: Record<string, string[]> = {};

      if (osqueryContext?.service?.getIntegrationNamespaces) {
        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );
        integrationNamespaces = await osqueryContext.service.getIntegrationNamespaces(
          [OSQUERY_INTEGRATION_NAME],
          spaceScopedClient,
          osqueryContext.logFactory.get('get_action_results')
        );
      }

      const scopedSearch = depsStart.data.search.asScoped(request);
      const parsedAgentIds = agentIds ? agentIds : [];
      const totalAgentCount = parsedAgentIds.length;

      const res = await lastValueFrom(
        scopedSearch.search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
          {
            actionId: actionId,
            factoryQueryType: OsqueryQueries.actionResults,
            agentIds: parsedAgentIds,
            kuery: kuery,
            startDate: startDate,
            pagination:
              parsedAgentIds.length > 0
                ? generateTablePaginationOptions(0, parsedAgentIds.length)
                : generateTablePaginationOptions(page ?? 0, pageSize ?? 100),
            sort: {
              direction: sortOrder ?? Direction.desc,
              field: sort ?? '@timestamp',
            },
            integrationNamespaces: integrationNamespaces[OSQUERY_INTEGRATION_NAME]?.length
              ? integrationNamespaces[OSQUERY_INTEGRATION_NAME]
              : undefined,
          },
          { strategy: 'osquerySearchStrategy' }
        )
      );

      const aggs = res.rawResponse?.aggregations as { aggs?: { responses_by_action_id?: { doc_count?: number; rows_count?: { value?: number }; responses?: { buckets?: Array<{ key: string; doc_count: number }> } } } } | undefined;
      const responseAgg = aggs?.aggs?.responses_by_action_id;
      const totalResponded = responseAgg?.doc_count ?? 0;
      const totalRowCount = responseAgg?.rows_count?.value ?? 0;
      const aggsBuckets = responseAgg?.responses?.buckets;

      const aggregations = {
        totalRowCount,
        totalResponded,
        successful: aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0,
        failed: aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0,
        pending: Math.max(0, totalAgentCount - totalResponded),
      };

      return JSON.stringify({
        edges: res.edges,
        total: totalAgentCount,
        currentPage: page ?? 0,
        pageSize: pageSize ?? 100,
        aggregations,
      });
    },
    {
      name: 'get_action_results',
      description: 'Get aggregated action results across agents',
      schema: z.object({
        actionId: z.string().describe('The action ID'),
        agentIds: z.array(z.string()).optional().describe('Filter by specific agent IDs'),
        page: z.number().optional().describe('Page number (default: 0)'),
        pageSize: z.number().optional().describe('Number of results per page (default: 100)'),
        sort: z.string().optional().describe('Field to sort by (default: @timestamp)'),
        sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)'),
        kuery: z.string().optional().describe('KQL query to filter results'),
        startDate: z.string().optional().describe('Start date for filtering results'),
      }),
    }
  );
};

/**
 * Creates the Osquery Live Query skill for running queries, fetching results, and browsing schemas.
 *
 * This skill combines functionality for:
 * - Running live osquery SQL queries against agents
 * - Fetching query results with automatic polling
 * - Browsing osquery table schemas
 *
 * @param getOsqueryContext - Factory function that returns the OsqueryAppContext at runtime.
 * @returns A Skill object containing all live query related tools.
 */
export const getLiveQuerySkill = (getOsqueryContext: GetOsqueryAppContextFn): Skill => {
  return {
    ...LIVE_QUERY_SKILL,
    tools: [
      createGetAgentsTool(getOsqueryContext),
      createGetSchemaTool(getOsqueryContext),
      createRunLiveQueryTool(getOsqueryContext),
      createGetLiveQueryResultsTool(getOsqueryContext),
      createGetActionResultsTool(getOsqueryContext),
    ],
  };
};
