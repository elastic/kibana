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
import { lastValueFrom } from 'rxjs';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
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
import { buildIndexNameWithNamespace } from '../../utils/build_index_name_with_namespace';

const RESULTS_SKILL: Omit<Skill, 'tools'> = {
  namespace: 'osquery.results',
  name: 'Osquery Results',
  description: 'Fetch osquery query results',
  content: `# Osquery Results Guide

This skill provides knowledge about fetching osquery query results.

## Overview
After running a live query, you can fetch the results using the action ID returned from the query execution. Results include data from all agents that responded to the query.

## Key Concepts

### Result Types
- **Live Query Results**: Results from a specific live query action
- **Action Results**: Aggregated results from an action across all agents

### Result Structure
- **columns**: Column definitions from the query
- **values**: Array of result rows
- **total**: Total number of results
- **page**: Current page number
- **pageSize**: Results per page

## Usage Examples

### Get live query results
\`\`\`
tool("get_live_query_results", {
  actionId: "action-uuid",
  page: 0,
  pageSize: 100
})
\`\`\`

### Get action results
\`\`\`
tool("get_action_results", {
  actionId: "action-uuid",
  agentIds: ["agent-123"],
  page: 0,
  pageSize: 100
})
\`\`\`

## Best Practices
- Use pagination for large result sets
- Filter by agent IDs when needed
- Check result aggregations for success/failure counts
- Handle timeouts and errors gracefully
`,
};

/**
 * Creates a LangChain tool for fetching live query results by action ID.
 *
 * @param getOsqueryContext - Factory function that returns the OsqueryAppContext
 * @returns A LangChain tool configured for fetching live query results
 * @internal
 */
const createGetLiveQueryResultsTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({ actionId, page, pageSize, sort, sortOrder, kuery, startDate }, config) => {
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
      let spaceAwareIndexPatterns: string[] = [];

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

        const baseIndexPatterns = [`logs-${OSQUERY_INTEGRATION_NAME}.result*`];
        spaceAwareIndexPatterns = baseIndexPatterns.flatMap((pattern) => {
          const osqueryNamespaces = integrationNamespaces[OSQUERY_INTEGRATION_NAME];
          if (osqueryNamespaces && osqueryNamespaces.length > 0) {
            return osqueryNamespaces.map((namespace) =>
              buildIndexNameWithNamespace(pattern, namespace)
            );
          }
          return [pattern];
        });
      }

      const search = depsStart.data.search;
      const { actionDetails } = await lastValueFrom(
        search.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
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

      const osqueryNamespaces = integrationNamespaces[OSQUERY_INTEGRATION_NAME];
      const namespacesOrUndefined =
        osqueryNamespaces && osqueryNamespaces.length > 0 ? osqueryNamespaces : undefined;

      const res = await lastValueFrom(
        search.search<ResultsRequestOptions, ResultsStrategyResponse>(
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

      return JSON.stringify({ data: res });
    },
    {
      name: 'get_live_query_results',
      description: 'Get results from a live osquery query action',
      schema: z.object({
        actionId: z.string().describe('The action ID from the live query execution'),
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
 * Creates a LangChain tool for fetching aggregated action results across agents.
 *
 * @param getOsqueryContext - Factory function that returns the OsqueryAppContext
 * @returns A LangChain tool configured for fetching action results
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
          osqueryContext.logFactory.get('get_action_results')
        );
      }

      const search = depsStart.data.search;
      const parsedAgentIds = agentIds ? agentIds : [];
      const totalAgentCount = parsedAgentIds.length;

      const res = await lastValueFrom(
        search.search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
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

      const responseAgg = res.rawResponse?.aggregations?.aggs.responses_by_action_id;
      const totalResponded = responseAgg?.doc_count ?? 0;
      const totalRowCount = responseAgg?.rows_count?.value ?? 0;
      const aggsBuckets = responseAgg?.responses.buckets;

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
 * Creates the Results skill for fetching osquery query execution results.
 *
 * After running a live query, use this skill to retrieve the results using
 * the action ID returned from the query execution. Supports both detailed
 * results and aggregated status across agents.
 *
 * @param getOsqueryContext - Factory function that returns the OsqueryAppContext at runtime.
 *                            This allows lazy initialization and proper dependency injection.
 * @returns A Skill object containing `get_live_query_results` and `get_action_results` tools.
 *
 * @example
 * ```typescript
 * const resultsSkill = getResultsSkill(() => osqueryAppContext);
 *
 * // The skill exposes two tools:
 * // - get_live_query_results: Get detailed results (actionId, page, pageSize, kuery)
 * // - get_action_results: Get aggregated status (actionId, agentIds, page, pageSize)
 * ```
 *
 * @remarks
 * Result types differ based on the tool used:
 * - `get_live_query_results`: Returns actual query data with column definitions and rows
 * - `get_action_results`: Returns execution status aggregations (successful, failed, pending)
 *
 * Both tools support pagination and KQL filtering for large result sets.
 *
 * @see {@link getLiveQuerySkill} for running queries that produce results
 */
export const getResultsSkill = (getOsqueryContext: GetOsqueryAppContextFn): Skill => {
  return {
    ...RESULTS_SKILL,
    tools: [createGetLiveQueryResultsTool(getOsqueryContext), createGetActionResultsTool(getOsqueryContext)],
  };
};





