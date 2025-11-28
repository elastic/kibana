/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CoreSetup } from '@kbn/core/server';
import type { ToolHandlerContext, SkillDefinition } from '@kbn/onechat-server';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { createActionHandler } from '../handlers';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';

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
  agent_platforms: z.array(z.string()).optional().describe('List of agent platforms to run query on'),
  agent_policy_ids: z.array(z.string()).optional().describe('List of agent policy IDs to run query on'),
  ecs_mapping: z.record(z.any()).optional().describe('ECS field mapping for query results'),
  alert_ids: z.array(z.string()).optional().describe('Associated alert IDs'),
  case_ids: z.array(z.string()).optional().describe('Associated case IDs'),
  event_ids: z.array(z.string()).optional().describe('Associated event IDs'),
});

const getLiveQueryResultsSchema = z.object({
  id: z.string().describe('Live query action ID'),
  actionId: z.string().describe('Action ID for the specific query result'),
  kuery: z.string().optional().describe('KQL query to filter results'),
  page: z.number().optional().describe('Page number for pagination'),
  pageSize: z.number().optional().describe('Number of results per page'),
  sort: z.string().optional().describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
  startDate: z.string().optional().describe('Start date for filtering results'),
});

const findLiveQueriesSchema = z.object({
  kuery: z.string().optional().describe('KQL query to filter live queries'),
  page: z.number().optional().describe('Page number for pagination'),
  pageSize: z.number().optional().describe('Number of results per page'),
  sort: z.string().optional().describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
});

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
      'Run query "select * from processes" on all agents',
      'Execute saved query by ID on specific agents',
      'Run a pack query on agents with specific policy',
    ],
    handler: async (params, context) => {
      const request = 'request' in context ? context.request : (context as any).request;
      if (!request) {
        throw new Error('Request is required to create live query');
      }

      const [coreStartServices] = await osqueryContext.getStartServices();
      const coreContext = await (context as any).core || (await coreStartServices);
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
    description: 'Retrieve results from a previously executed live query.',
    category: 'osquery',
    inputSchema: getLiveQueryResultsSchema,
    examples: [
      'Get results for live query action ID',
      'Filter results by agent or timestamp',
    ],
    handler: async (params, context) => {
      const request = 'request' in context ? context.request : (context as any).request;
      if (!request) {
        throw new Error('Request is required to get live query results');
      }

      // This would need to call the get_live_query_results_route handler
      // For now, return a placeholder that indicates the route needs to be called
      return {
        message: 'Live query results retrieval requires direct API call',
        actionId: params.actionId,
        id: params.id,
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
      'List all live queries',
      'Find live queries for specific agents',
      'Get recent live queries',
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

