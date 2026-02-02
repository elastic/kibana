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
const POLL_INTERVAL_MS = 5000; // 5 seconds between polls
const MAX_POLL_DURATION_MS = 2 * 60 * 1000; // 2 minutes maximum wait time

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const OSQUERY_LIVE_QUERY_SKILL: Omit<Skill, 'tools'> = {
  namespace: 'osquery.live_query',
  name: 'Osquery Live Query',
  description: 'Run live osquery queries, fetch results, and browse table schemas',
  content: `# Osquery Live Query Guide

This skill provides tools for running live osquery queries against agents, fetching results, and browsing table schemas.

## Complete Query Workflow

**You MUST follow this complete workflow:**

### Step 1: MANDATORY - Check Schema First
\`\`\`
get_schema({ table: "processes" })
\`\`\`
- **ALWAYS verify the table exists and get exact column names BEFORE running queries**
- Use ONLY columns returned by get_schema
- This prevents "no such column" errors!

### Step 2: Run the Query
\`\`\`
run_live_query({ query: "SELECT pid, name FROM processes", agent_ids: [...] })
\`\`\`
- This returns an **action_id** - NOT the actual results!
- Results are collected asynchronously from agents

### Step 3: MANDATORY - Fetch Results (NEVER SKIP!)
\`\`\`
get_live_query_results({ actionId: "<action_id_from_step_2>" })
\`\`\`
- **You MUST call this to get actual query data**
- **The tool automatically waits up to 2 minutes for all agents to respond** - no manual retry needed!
- Check the **status** field in the response:
  - \`completed\` → All agents responded. Results are ready to analyze.
  - \`error\` → Query completed but some agents failed. Check the \`errors\` array for details.
  - \`timeout\` → Waited 2 minutes but some agents are still offline/unresponsive.

### Step 4: Analyze Results
Only after fetching actual results, analyze and report findings.

## Available Tools

### get_schema
Browse osquery table schemas.
- Pass null/undefined: List all available tables
- Pass table name: Get column definitions for that table

### run_live_query
Execute a live osquery SQL query against agents.
- Returns an action_id (NOT results)
- Requires agent selection (agent_ids, agent_all, etc.)

### get_live_query_results
Fetch results from a live query execution.
- Automatically polls for up to 2 minutes
- Returns actual query data with rows and columns
- Includes error messages from failed queries

### get_action_results
Get aggregated execution status across agents.
- Returns success/failure/pending counts

## Handling Query Errors

If \`get_live_query_results\` returns errors like "no such column: X":
1. The query syntax was correct but referenced a non-existent column
2. **Use get_schema to verify the correct column names**
3. Fix the query and retry

Common error types:
- \`no such column: X\` - Column doesn't exist, use get_schema to find valid columns
- \`no such table: X\` - Table doesn't exist, use get_schema to list tables
- \`query failed, code: 1\` - Syntax error or invalid reference

## Agent Selection

- **agent_ids**: Specific agent IDs to target
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
1. **ALWAYS check schema first**: Use get_schema to verify tables and columns BEFORE running queries
2. **ALWAYS fetch results**: Call get_live_query_results after running a query
3. **Check for errors**: If results show failed > 0, check the errors array
4. **Scope queries appropriately**: Avoid running queries on all agents unless necessary

## Important Notes
- **ALWAYS call get_schema before running queries** to verify table/column names
- **ALWAYS call get_live_query_results after run_live_query** to get actual data
- **ALWAYS check for errors in the results** - failed queries will have error messages
- run_live_query returns action_id, NOT results
- Always specify agent selection (agent_ids, agent_all, etc.)
`,
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
          message: `Live query dispatched successfully. Action ID: ${osqueryAction.action_id}`,
          next_step: `IMPORTANT: This only dispatched the query. You MUST now call get_live_query_results with actionId "${osqueryAction.action_id}" to fetch the actual results. Do NOT conclude your investigation without fetching and analyzing the results.`,
          error_handling: `If the results show errors (failed > 0), check the errors array. For "no such column" errors, use get_schema to verify the correct column names and retry with the correct query.`,
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

/**
 * Creates a LangChain tool for fetching live query results by action ID.
 * This tool automatically polls for results until complete or timeout (2 minutes).
 * @internal
 */
const createGetLiveQueryResultsTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({ actionId, page, pageSize, sort, sortOrder, kuery, startDate, waitForResults = true }, config) => {
      const onechatContext = getOneChatContext(config);
      if (!onechatContext) {
        throw new Error('OneChat context not available');
      }

      const osqueryContext = getOsqueryContext();
      if (!osqueryContext) {
        throw new Error('Osquery context not available');
      }

      const { request, spaceId: contextSpaceId } = onechatContext;
      const space = await osqueryContext.service.getActiveSpace(request);
      const spaceId = space?.id ?? contextSpaceId ?? DEFAULT_SPACE_ID;

      const [coreStart, depsStart] = await osqueryContext.getStartServices();

      let integrationNamespaces: Record<string, string[]> = {};

      if (osqueryContext?.service?.getIntegrationNamespaces) {
        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );
        integrationNamespaces = await osqueryContext.service.getIntegrationNamespaces(
          [OSQUERY_INTEGRATION_NAME],
          spaceScopedClient,
          osqueryContext.logFactory.get('get_live_query_results')
        );
      }

      void coreStart;
      const scopedSearch = depsStart.data.search.asScoped(request);

      const osqueryNamespaces = integrationNamespaces[OSQUERY_INTEGRATION_NAME];
      const namespacesOrUndefined =
        osqueryNamespaces && osqueryNamespaces.length > 0 ? osqueryNamespaces : undefined;

      const fetchResults = async () => {
        const { actionDetails } = await lastValueFrom(
          scopedSearch.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
            {
              actionId: actionId,
              kuery: kuery,
              factoryQueryType: OsqueryQueries.actionDetails,
              spaceId,
            },
            { strategy: 'osquerySearchStrategy' }
          )
        );

        if (!actionDetails) {
          throw new Error(`Action ${actionId} not found`);
        }

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

        const actionResultsRes = await lastValueFrom(
          scopedSearch.search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
            {
              actionId: actionId,
              factoryQueryType: OsqueryQueries.actionResults,
              kuery: kuery,
              startDate: startDate,
              pagination: generateTablePaginationOptions(0, 100),
              sort: {
                direction: sortOrder ?? Direction.desc,
                field: sort ?? '@timestamp',
              },
              integrationNamespaces: namespacesOrUndefined,
            },
            { strategy: 'osquerySearchStrategy' }
          )
        );

        const actionSource = actionDetails._source as {
          agents?: string[];
          expiration?: string;
          queries?: Array<{ action_id: string; agents?: string[] }>;
        } | undefined;
        const actionFields = actionDetails.fields as { expiration?: string[] } | undefined;

        const matchingQuery = actionSource?.queries?.find((q) => q.action_id === actionId);
        const agentsCount = matchingQuery?.agents?.length ?? actionSource?.agents?.length ?? 0;

        const expirationDate = actionFields?.expiration?.[0] || actionSource?.expiration;
        const isExpired = !expirationDate ? true : new Date(expirationDate) < new Date();

        const aggs = actionResultsRes.rawResponse?.aggregations as { aggs?: { responses_by_action_id?: { doc_count?: number; rows_count?: { value?: number }; responses?: { buckets?: Array<{ key: string; doc_count: number }> } } } } | undefined;
        const responseAgg = aggs?.aggs?.responses_by_action_id;
        const totalResponded = responseAgg?.doc_count ?? 0;
        const totalRowCount = responseAgg?.rows_count?.value ?? 0;
        const aggsBuckets = responseAgg?.responses?.buckets;
        const successful = aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0;
        const failed = aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0;

        const pending = Math.max(0, agentsCount - totalResponded);
        const hasQueryResults = res.edges && res.edges.length > 0;

        const isCompleted = isExpired ||
          (agentsCount > 0 && pending === 0) ||
          hasQueryResults ||
          successful > 0 ||
          totalResponded > 0;

        return {
          res,
          actionResultsRes,
          agentsCount,
          isExpired,
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
        osqueryContext.logFactory.get('get_live_query_results').error(
          `Initial fetch failed for action ${actionId}: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }

      while (waitForResults && !lastResult.isCompleted && (Date.now() - startTime) < MAX_POLL_DURATION_MS) {
        pollCount++;
        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        const { pending, agentsCount, totalResponded } = lastResult;

        osqueryContext.logFactory.get('get_live_query_results').debug(
          `[Poll ${pollCount}] Waiting for results... ${totalResponded}/${agentsCount} agents responded, ${pending} pending, hasResults: ${lastResult.hasQueryResults}. Elapsed: ${elapsedSeconds}s`
        );

        await sleep(POLL_INTERVAL_MS);

        try {
          lastResult = await fetchResults();
        } catch (error) {
          osqueryContext.logFactory.get('get_live_query_results').error(
            `Poll ${pollCount} failed for action ${actionId}: ${error instanceof Error ? error.message : String(error)}`
          );
          break;
        }
      }

      const {
        res,
        actionResultsRes,
        agentsCount,
        isExpired,
        totalResponded,
        totalRowCount,
        successful,
        failed,
        pending,
        isCompleted,
        hasQueryResults,
      } = lastResult;

      const completionReason = isExpired ? 'expired' :
        (agentsCount > 0 && pending === 0) ? 'all_agents_responded' :
          hasQueryResults ? 'has_query_results' :
            successful > 0 ? 'successful_responses' :
              totalResponded > 0 ? 'has_responses' :
                (Date.now() - startTime) >= MAX_POLL_DURATION_MS ? 'timeout' : 'unknown';

      osqueryContext.logFactory.get('get_live_query_results').debug(
        `Polling ended after ${pollCount} polls, ${Math.round((Date.now() - startTime) / 1000)}s. ` +
        `Reason: ${completionReason}. ` +
        `Stats: agentsCount=${agentsCount}, totalResponded=${totalResponded}, successful=${successful}, ` +
        `failed=${failed}, pending=${pending}, hasQueryResults=${hasQueryResults}, isExpired=${isExpired}, isCompleted=${isCompleted}`
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

          const error = errorFromSource || errorFromFields || errorFromKeyword || errorFromActionResponse;

          if (error) {
            const agentId =
              (source?.agent_id as string) ||
              (fields?.agent_id?.[0] as string) ||
              (fields?.['agent.id']?.[0] as string) ||
              (source?.agent as { id?: string })?.id ||
              'unknown';
            errors.push({ agent_id: agentId, error });
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
        isExpired: boolean;
        pollInfo: { pollCount: number; elapsedMs: number; maxWaitMs: number };
        errors?: typeof errors;
        warning?: string;
      } = {
        data: res,
        aggregations,
        status,
        isExpired,
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
      description: 'Get results from a live osquery query action. This tool automatically waits and polls for up to 2 minutes until all agents have responded or the query expires. Returns execution status, results data, and any error messages from failed queries.',
      schema: z.object({
        actionId: z.string().describe('The action ID from the live query execution'),
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
export const getOsqueryLiveQuerySkill = (getOsqueryContext: GetOsqueryAppContextFn): Skill => {
  return {
    ...OSQUERY_LIVE_QUERY_SKILL,
    tools: [
      createGetSchemaTool(getOsqueryContext),
      createRunLiveQueryTool(getOsqueryContext),
      createGetLiveQueryResultsTool(getOsqueryContext),
      createGetActionResultsTool(getOsqueryContext),
    ],
  };
};
