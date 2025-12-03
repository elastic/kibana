/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CoreSetup } from '@kbn/core/server';
import type { SkillDefinition } from '@kbn/onechat-server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { lastValueFrom, zip } from 'rxjs';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { createActionHandler } from '../handlers';
import { OSQUERY_INTEGRATION_NAME } from '../../common/constants';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import { getActionResponses } from '../routes/live_query/utils';
import {
  OsqueryQueries,
  Direction,
  type ActionDetailsRequestOptions,
  type ActionDetailsStrategyResponse,
  type ResultsRequestOptions,
  type ResultsStrategyResponse,
} from '../../common/search_strategy';
import { generateTablePaginationOptions } from '../../common/utils/build_query';
import type { StartPlugins } from '../types';

const createLiveQuerySchema = z.object({
  query: z.string().optional().describe('Osquery SQL query to execute'),
  queries: z
    .array(
      z.object({
        id: z.string(),
        query: z.string(),
        timeout: z.number().optional(),
        ecs_mapping: z.record(z.any()).optional(),
      })
    )
    .optional()
    .describe('Array of queries to execute'),
  saved_query_id: z.string().optional().describe('ID of a saved query to execute'),
  pack_id: z.string().optional().describe('ID of a pack to execute'),
  agent_all: z.boolean().optional().describe('Run query on all agents'),
  agent_ids: z.array(z.string()).optional().describe('List of agent IDs to run query on'),
  agent_platforms: z
    .array(z.string())
    .optional()
    .describe('List of agent platforms to run query on'),
  agent_policy_ids: z
    .array(z.string())
    .optional()
    .describe('List of agent policy IDs to run query on'),
  ecs_mapping: z.record(z.any()).optional().describe('ECS field mapping for query results'),
  alert_ids: z.array(z.string()).optional().describe('Associated alert IDs'),
  case_ids: z.array(z.string()).optional().describe('Associated case IDs'),
  event_ids: z.array(z.string()).optional().describe('Associated event IDs'),
});

const getLiveQueryResultsSchema = z.object({
  action_id: z.string().describe('The main live query action ID (returned from create_live_query)'),
  query_action_ids: z
    .array(z.string())
    .describe('Array of query-specific action IDs to fetch results for'),
  kuery: z.string().optional().describe('KQL query to filter results'),
  page: z.number().optional().describe('Page number for pagination'),
  pageSize: z.number().optional().describe('Number of results per page'),
  sort: z.string().optional().describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
  startDate: z.string().optional().describe('Start date for filtering results'),
  timeout_seconds: z
    .number()
    .optional()
    .default(300)
    .describe('Maximum time to wait for results (default: 300 seconds / 5 minutes)'),
  poll_interval_seconds: z
    .number()
    .optional()
    .default(5)
    .describe('How often to check for results (default: 5 seconds)'),
  wait_for_completion: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to wait for the query to complete before returning results'),
});

const findLiveQueriesSchema = z.object({
  kuery: z.string().optional().describe('KQL query to filter live queries'),
  page: z.number().optional().describe('Page number for pagination'),
  pageSize: z.number().optional().describe('Number of results per page'),
  sort: z.string().optional().describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
});

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createLiveQueriesSkills({
  coreSetup,
  osqueryContext,
}: {
  coreSetup: CoreSetup<any, any>;
  osqueryContext: OsqueryAppContext;
}): SkillDefinition[] {
  const createLiveQuerySkill: SkillDefinition = {
    id: 'osquery.create_live_query',
    name: 'Create Live Query',
    description:
      'Create and execute an Osquery live query on selected agents. Osquery allows you to query endpoint data using SQL-like syntax.',
    category: 'osquery',
    inputSchema: createLiveQuerySchema,
    examples: [
      // Run a simple query on all agents
      'tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"query":"SELECT * FROM processes","agent_all":true}})',
      // Run a query on specific agents
      'tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"query":"SELECT * FROM users","agent_ids":["<agent_uuid>"]}})',
      // Run a query on agents with specific platform
      'tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"query":"SELECT name, pid, path FROM processes WHERE name LIKE \'%chrome%\'","agent_platforms":["linux"]}})',
      // Run a saved query by ID
      'tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"saved_query_id":"<saved_query_id>","agent_all":true}})',
      // Run a pack on agents with specific policy
      'tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"pack_id":"<pack_id>","agent_policy_ids":["<policy_id>"]}})',
      // Query system info on specific agents
      'tool("invoke_skill", {"skillId":"osquery.create_live_query","params":{"query":"SELECT * FROM system_info","agent_ids":["<agent_uuid>"]}})',
    ],
    handler: async (params, context) => {
      const request = 'request' in context ? context.request : (context as any).request;
      if (!request) {
        throw new Error('Request is required to create live query');
      }

      const [coreStartServices] = await osqueryContext.getStartServices();
      const coreContext = (await (context as any).core) || (await coreStartServices);
      const currentUser = coreContext?.security?.authc?.getCurrentUser?.()?.username;
      const space = await osqueryContext.service.getActiveSpace(request);

      try {
        const { response: osqueryAction, fleetActionsCount } = await createActionHandler(
          osqueryContext,
          params as any,
          {
            metadata: { currentUser },
            space,
          }
        );

        if (!fleetActionsCount) {
          throw new Error('No agents found for selection');
        }

        return {
          action_id: osqueryAction.action_id,
          '@timestamp': osqueryAction['@timestamp'],
          expiration: osqueryAction.expiration,
          agents: osqueryAction.agents,
          queries: osqueryAction.queries,
        };
      } catch (error) {
        throw new Error(
          `Failed to create live query: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };

  const getLiveQueryResultsSkill: SkillDefinition = {
    id: 'osquery.get_live_query_results',
    name: 'Get Live Query Results',
    description: `Retrieve results from a previously executed live query. 
    
This skill will wait for all queries to complete before returning results by default.

Parameters:
- action_id: The main live query action ID (returned from create_live_query)
- query_action_ids: Array of query-specific action IDs to fetch results for (each query in a live query action has its own action_id)
- timeout_seconds: Maximum time to wait for completion (default: 300 seconds)
- poll_interval_seconds: Polling interval (default: 5 seconds)
- wait_for_completion: Set to false to return immediately without waiting

The query_action_ids can be obtained from the 'queries' array in the create_live_query response.`,
    category: 'osquery',
    inputSchema: getLiveQueryResultsSchema,
    examples: [
      // Wait for results from a single query
      'tool("invoke_skill", {"skillId":"osquery.get_live_query_results","params":{"action_id":"<action_id>","query_action_ids":["<query_action_id>"]}})',
      // Get results from multiple queries
      'tool("invoke_skill", {"skillId":"osquery.get_live_query_results","params":{"action_id":"<action_id>","query_action_ids":["<query_action_id_1>","<query_action_id_2>"]}})',
      // Get results with custom timeout
      'tool("invoke_skill", {"skillId":"osquery.get_live_query_results","params":{"action_id":"<action_id>","query_action_ids":["<query_action_id>"],"timeout_seconds":60}})',
      // Get results immediately without waiting
      'tool("invoke_skill", {"skillId":"osquery.get_live_query_results","params":{"action_id":"<action_id>","query_action_ids":["<query_action_id>"],"wait_for_completion":false}})',
    ],
    handler: async (params, context) => {
      const {
        action_id,
        query_action_ids,
        kuery,
        page,
        pageSize,
        sort,
        sortOrder,
        startDate,
        timeout_seconds = 300,
        poll_interval_seconds = 5,
        wait_for_completion = true,
      } = params as z.infer<typeof getLiveQueryResultsSchema>;

      const request = 'request' in context ? context.request : (context as any).request;
      if (!request) {
        throw new Error('Request is required to get live query results');
      }

      // Get logger from context or create a fallback
      const logger = osqueryContext.logFactory.get('live_query_results_skill');

      // Get space ID
      const space = await osqueryContext.service.getActiveSpace(request);
      const spaceId = space?.id || DEFAULT_SPACE_ID;

      // Get scoped search client from data plugin - this uses the same code path as routes
      const startServices = await osqueryContext.getStartServices();
      const depsStart = startServices[1] as StartPlugins;

      logger.info(
        `Getting live query results for action ${action_id}, queries: ${query_action_ids.join(', ')}`
      );

      // Validate that we have a proper request object
      if (!request || typeof request !== 'object') {
        throw new Error(`Invalid request object: ${typeof request}`);
      }

      logger.debug(`Request URL: ${request.url?.pathname || 'unknown'}`);

      const scopedSearch = depsStart.data.search.asScoped(request);

      // Get action details using the search strategy (same as routes)
      const { actionDetails } = await lastValueFrom(
        scopedSearch.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
          {
            actionId: action_id,
            factoryQueryType: OsqueryQueries.actionDetails,
            spaceId,
          },
          { strategy: 'osquerySearchStrategy' }
        )
      );

      if (!actionDetails) {
        throw new Error(`Live query action ${action_id} not found`);
      }

      const actionSource = actionDetails._source;
      const expirationDate = (actionDetails.fields as Record<string, unknown[]> | undefined)
        ?.expiration?.[0] as string | undefined;
      const isExpired = expirationDate ? new Date(expirationDate) < new Date() : true;

      logger.info(
        `Action details found: queries=${actionSource?.queries?.length ?? 0}, expiration=${expirationDate}, isExpired=${isExpired}`
      );

      // Use the action's timestamp as startDate if not provided
      const effectiveStartDate = startDate || actionSource?.['@timestamp'];
      logger.info(
        `Using startDate: ${effectiveStartDate} (provided: ${startDate}, action timestamp: ${actionSource?.['@timestamp']})`
      );

      // Get integration namespaces for proper index resolution
      let integrationNamespaces: string[] | undefined;
      try {
        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );
        const namespaces = await osqueryContext.service.getIntegrationNamespaces(
          [OSQUERY_INTEGRATION_NAME],
          spaceScopedClient,
          logger
        );
        integrationNamespaces = namespaces[OSQUERY_INTEGRATION_NAME];
        logger.debug(`Retrieved integration namespaces: ${JSON.stringify(integrationNamespaces)}`);
      } catch (error) {
        logger.debug(`Could not get integration namespaces: ${error}`);
      }

      const namespacesOrUndefined =
        integrationNamespaces && integrationNamespaces.length > 0
          ? integrationNamespaces
          : undefined;

      logger.info(`Using integration namespaces: ${JSON.stringify(namespacesOrUndefined)}`);

      // Build a map of query action IDs to their expected agent counts
      const queries = actionSource?.queries || [];
      const queryAgentCounts = new Map<string, number>();
      for (const queryActionId of query_action_ids) {
        const query = queries.find((q) => q.action_id === queryActionId);
        queryAgentCounts.set(queryActionId, query?.agents?.length ?? 0);
      }

      if (wait_for_completion) {
        // Poll until all queries complete AND results are indexed, or timeout
        const startTime = Date.now();
        const timeoutMs = timeout_seconds * 1000;
        const pollIntervalMs = poll_interval_seconds * 1000;
        let pollCount = 0;
        let agentsRespondedTime: number | null = null;

        logger.info(
          `Waiting for ${query_action_ids.length} queries to complete (timeout: ${timeout_seconds}s)`
        );

        while (Date.now() - startTime < timeoutMs) {
          pollCount++;

          // Check if action is expired
          if (isExpired) {
            logger.info(`Action ${action_id} has expired`);
            break;
          }

          // Check status for all queries using the search strategy
          let allAgentsResponded = true;
          let totalExpectedDocs = 0;
          let totalActualDocs = 0;

          const statusResults = await lastValueFrom(
            zip(
              ...query_action_ids.map((queryActionId) =>
                getActionResponses(
                  scopedSearch,
                  queryActionId,
                  queryAgentCounts.get(queryActionId) ?? 0,
                  namespacesOrUndefined
                )
              )
            )
          );

          for (const status of statusResults) {
            const expectedAgents = queryAgentCounts.get(status.action_id) ?? 0;
            logger.debug(
              `Poll ${pollCount}, query ${status.action_id}: ${status.responded}/${expectedAgents} agents responded, ${status.pending} pending, ${status.docs} docs reported`
            );

            if (status.pending > 0) {
              allAgentsResponded = false;
            }

            // Track expected vs actual docs (from action responses metadata)
            // The 'docs' field is the sum of rows_count from action responses
            totalExpectedDocs += status.docs;
            totalActualDocs += status.docs;
          }

          if (allAgentsResponded && agentsRespondedTime === null) {
            agentsRespondedTime = Date.now();
            logger.info(
              `All agents responded after ${pollCount} polls (${Math.round((agentsRespondedTime - startTime) / 1000)}s)`
            );
          }

          // After agents have responded, verify results are actually indexed in the results index
          if (allAgentsResponded) {
            // Check if results are available in the results index
            let resultsIndexed = true;
            for (const queryActionId of query_action_ids) {
              try {
                const resultsCheck = await lastValueFrom(
                  scopedSearch.search<ResultsRequestOptions, ResultsStrategyResponse>(
                    {
                      actionId: queryActionId,
                      factoryQueryType: OsqueryQueries.results,
                      startDate: effectiveStartDate,
                      pagination: generateTablePaginationOptions(0, 1), // Just check if any results exist
                      sort: [{ direction: Direction.desc, field: '@timestamp' }],
                      integrationNamespaces: namespacesOrUndefined,
                    },
                    { strategy: 'osquerySearchStrategy' }
                  )
                );

                const hitsTotal = resultsCheck.rawResponse?.hits?.total;
                const totalHits =
                  typeof hitsTotal === 'number'
                    ? hitsTotal
                    : (hitsTotal as { value: number })?.value ?? 0;

                // Find the expected docs for this query from status results
                const queryStatus = statusResults.find((s) => s.action_id === queryActionId);
                const expectedDocs = queryStatus?.docs ?? 0;

                logger.debug(
                  `Poll ${pollCount}, query ${queryActionId}: ${totalHits} results indexed, ${expectedDocs} expected from agent`
                );

                // If agent reported docs but we haven't indexed them yet, keep waiting
                // But if agent reported 0 docs, that's fine (empty result set)
                if (expectedDocs > 0 && totalHits < expectedDocs) {
                  resultsIndexed = false;
                }
              } catch (error) {
                logger.debug(`Error checking results for ${queryActionId}: ${error}`);
                resultsIndexed = false;
              }
            }

            if (resultsIndexed) {
              logger.info(
                `All results indexed after ${pollCount} polls (${Math.round((Date.now() - startTime) / 1000)}s)`
              );
              break;
            }
          }

          // Wait before next poll
          await sleep(pollIntervalMs);
        }

        // Check if we timed out
        if (Date.now() - startTime >= timeoutMs) {
          logger.warn(`Timeout waiting for queries after ${timeout_seconds}s`);
        }
      }

      // Fetch results for each query using the search strategy
      const queryResults: Array<{
        query_action_id: string;
        status: string;
        agents: {
          total: number;
          responded: number;
          successful: number;
          failed: number;
          pending: number;
        };
        results: {
          total: number;
          page: number;
          page_size: number;
          data: Array<Record<string, unknown>>;
        };
      }> = [];

      for (const queryActionId of query_action_ids) {
        const expectedAgentCount = queryAgentCounts.get(queryActionId) ?? 0;

        // Build the search request (same params as the route)
        const searchRequest: ResultsRequestOptions = {
          actionId: queryActionId,
          factoryQueryType: OsqueryQueries.results,
          kuery,
          startDate: effectiveStartDate,
          pagination: generateTablePaginationOptions(page ?? 0, pageSize ?? 100),
          sort: [
            {
              direction: sortOrder === 'asc' ? Direction.asc : Direction.desc,
              field: sort ?? '@timestamp',
            },
          ],
          integrationNamespaces: namespacesOrUndefined,
        };

        logger.debug(`Search request for ${queryActionId}: ${JSON.stringify(searchRequest)}`);

        // Fetch the results using the search strategy (same as routes)
        let resultsResponse: ResultsStrategyResponse;
        try {
          resultsResponse = await lastValueFrom(
            scopedSearch.search<ResultsRequestOptions, ResultsStrategyResponse>(
              searchRequest,
              { strategy: 'osquerySearchStrategy' }
            )
          );

          // Log raw response details for debugging
          logger.info(
            `Results response for ${queryActionId}: edges=${resultsResponse.edges?.length ?? 0}, rawHits=${resultsResponse.rawResponse?.hits?.hits?.length ?? 0}, total=${JSON.stringify(resultsResponse.rawResponse?.hits?.total)}`
          );

          // Log first edge if available
          if (resultsResponse.edges?.length > 0) {
            logger.debug(`First edge: ${JSON.stringify(resultsResponse.edges[0])}`);
          }
        } catch (searchError) {
          logger.error(`Error searching for results: ${searchError}`);
          throw searchError;
        }

        // Get final status using the search strategy
        const finalStatus = await lastValueFrom(
          getActionResponses(
            scopedSearch,
            queryActionId,
            expectedAgentCount,
            namespacesOrUndefined
          )
        );

        // Determine completion status for this query
        const isQueryComplete = isExpired || finalStatus.pending === 0;

        // Get total from rawResponse.hits.total (same way the search strategy processes it)
        const hitsTotal = resultsResponse.rawResponse?.hits?.total;
        const totalResults =
          typeof hitsTotal === 'number' ? hitsTotal : (hitsTotal as { value: number })?.value ?? 0;

        logger.debug(`Total results for ${queryActionId}: ${totalResults}`);

        queryResults.push({
          query_action_id: queryActionId,
          status: isQueryComplete ? 'completed' : 'running',
          agents: {
            total: expectedAgentCount,
            responded: finalStatus.responded,
            successful: finalStatus.successful,
            failed: finalStatus.failed,
            pending: finalStatus.pending,
          },
          results: {
            total: totalResults,
            page: page ?? 0,
            page_size: pageSize ?? 100,
            data: resultsResponse.edges.map((edge) => ({
              _id: edge._id,
              ...edge.fields,
            })),
          },
        });
      }

      // Determine overall completion status
      const allComplete = queryResults.every((qr) => qr.status === 'completed');
      const overallStatus = allComplete ? 'completed' : 'running';

      return {
        action_id,
        status: overallStatus,
        is_completed: allComplete,
        is_expired: isExpired,
        queries: queryResults,
      };
    },
  };

  const findLiveQueriesSkill: SkillDefinition = {
    id: 'osquery.find_live_queries',
    name: 'Find Live Queries',
    description: 'Search and list live queries with optional filters.',
    category: 'osquery',
    inputSchema: findLiveQueriesSchema,
    examples: [
      // List all live queries with default pagination
      'tool("invoke_skill", {"skillId":"osquery.find_live_queries","params":{}})',
      // List live queries with pagination
      'tool("invoke_skill", {"skillId":"osquery.find_live_queries","params":{"page":1,"pageSize":20}})',
      // Find live queries sorted by timestamp
      'tool("invoke_skill", {"skillId":"osquery.find_live_queries","params":{"sort":"@timestamp","sortOrder":"desc"}})',
      // Filter live queries with KQL
      'tool("invoke_skill", {"skillId":"osquery.find_live_queries","params":{"kuery":"agents: <agent_uuid>"}})',
    ],
    handler: async (params, context) => {
      const request = 'request' in context ? context.request : (context as any).request;
      if (!request) {
        throw new Error('Request is required to find live queries');
      }

      // This would need to call the find_live_query_route handler
      // For now, return a placeholder
      return {
        message: 'Live query search requires direct API call',
        filters: params,
      };
    },
  };

  return [createLiveQuerySkill, getLiveQueryResultsSkill, findLiveQueriesSkill];
}
