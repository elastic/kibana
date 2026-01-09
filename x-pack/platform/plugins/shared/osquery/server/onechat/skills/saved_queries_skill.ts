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
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { savedQuerySavedObjectType } from '../../../common/types';
import type { SavedQuerySavedObject } from '../../common/types';
import { convertECSMappingToObject } from '../../routes/utils';
import { getInstalledSavedQueriesMap } from '../../routes/saved_query/utils';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';

const SAVED_QUERIES_SKILL: Omit<Skill, 'tools'> = {
  namespace: 'osquery.saved_queries',
  name: 'Osquery Saved Queries',
  description: 'List and retrieve saved osquery queries',
  content: `# Osquery Saved Queries Guide

This skill provides knowledge about working with saved osquery queries.

## Overview
Saved queries are reusable osquery SQL queries that can be referenced by ID when running live queries. They help standardize common queries and reduce errors.

## Key Concepts

### Query Properties
- **id**: Unique identifier for the query
- **query**: The osquery SQL query string
- **description**: Human-readable description
- **interval**: Scheduling interval (if used in packs)
- **platform**: Target platform (windows, darwin, linux, or all)
- **ecs_mapping**: ECS field mappings for results
- **prebuilt**: Whether the query is a prebuilt system query

## Usage Examples

### List saved queries
\`\`\`
tool("list_saved_queries", {
  page: 1,
  pageSize: 20
})
\`\`\`

### Get a specific saved query
\`\`\`
tool("get_saved_query", {
  saved_query_id: "saved-query-uuid"
})
\`\`\`

## Best Practices
- Use saved queries for frequently used queries
- Include clear descriptions
- Specify platform when applicable
- Use ECS mappings to normalize results
`,
};

const createListSavedQueriesTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({ page, pageSize, sort, sortOrder }, config) => {
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

      const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
        osqueryContext,
        request
      );

      const savedQueries = await spaceScopedClient.find<SavedQuerySavedObject>({
        type: savedQuerySavedObjectType,
        page: page || 1,
        perPage: pageSize,
        sortField: sort || 'id',
        sortOrder: sortOrder || 'desc',
      });

      const prebuiltSavedQueriesMap = await getInstalledSavedQueriesMap(
        osqueryContext.service.getPackageService()?.asInternalUser,
        spaceScopedClient,
        spaceId
      );

      const savedObjects = savedQueries.saved_objects.map((savedObject) => {
        const ecs_mapping = savedObject.attributes.ecs_mapping;
        const prebuiltById = savedObject.id && prebuiltSavedQueriesMap[savedObject.id];
        const prebuiltByOriginId =
          !prebuiltById && savedObject.originId
            ? prebuiltSavedQueriesMap[savedObject.originId]
            : false;

        return {
          saved_object_id: savedObject.id,
          id: savedObject.attributes.id,
          query: savedObject.attributes.query,
          description: savedObject.attributes.description,
          interval: savedObject.attributes.interval,
          timeout: savedObject.attributes.timeout,
          platform: savedObject.attributes.platform,
          ecs_mapping: ecs_mapping ? convertECSMappingToObject(ecs_mapping) : undefined,
          created_at: savedObject.attributes.created_at,
          created_by: savedObject.attributes.created_by,
          updated_at: savedObject.attributes.updated_at,
          updated_by: savedObject.attributes.updated_by,
          prebuilt: !!(prebuiltById || prebuiltByOriginId),
        };
      });

      return JSON.stringify({
        data: savedObjects,
        total: savedQueries.total,
        page: savedQueries.page,
        per_page: savedQueries.per_page,
      });
    },
    {
      name: 'list_saved_queries',
      description: 'List saved osquery queries with pagination support',
      schema: z.object({
        page: z.number().optional().describe('Page number (default: 1)'),
        pageSize: z.number().optional().describe('Number of items per page'),
        sort: z.string().optional().describe('Field to sort by (default: id)'),
        sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)'),
      }),
    }
  );
};

const createGetSavedQueryTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({ saved_query_id }, config) => {
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

      const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
        osqueryContext,
        request
      );

      const savedObject = await spaceScopedClient.get<SavedQuerySavedObject>(
        savedQuerySavedObjectType,
        saved_query_id
      );

      const prebuiltSavedQueriesMap = await getInstalledSavedQueriesMap(
        osqueryContext.service.getPackageService()?.asInternalUser,
        spaceScopedClient,
        spaceId
      );

      const ecs_mapping = savedObject.attributes.ecs_mapping;
      const prebuiltById = savedObject.id && prebuiltSavedQueriesMap[savedObject.id];
      const prebuiltByOriginId =
        !prebuiltById && savedObject.originId
          ? prebuiltSavedQueriesMap[savedObject.originId]
          : false;

      const data = {
        saved_object_id: savedObject.id,
        id: savedObject.attributes.id,
        query: savedObject.attributes.query,
        description: savedObject.attributes.description,
        interval: savedObject.attributes.interval,
        timeout: savedObject.attributes.timeout,
        platform: savedObject.attributes.platform,
        ecs_mapping: ecs_mapping ? convertECSMappingToObject(ecs_mapping) : undefined,
        created_at: savedObject.attributes.created_at,
        created_by: savedObject.attributes.created_by,
        updated_at: savedObject.attributes.updated_at,
        updated_by: savedObject.attributes.updated_by,
        prebuilt: !!(prebuiltById || prebuiltByOriginId),
      };

      return JSON.stringify({ data });
    },
    {
      name: 'get_saved_query',
      description: 'Get details of a specific saved osquery query by ID',
      schema: z.object({
        saved_query_id: z.string().describe('The saved query ID to retrieve'),
      }),
    }
  );
};

export const getSavedQueriesSkill = (getOsqueryContext: GetOsqueryAppContextFn): Skill => {
  return {
    ...SAVED_QUERIES_SKILL,
    tools: [createListSavedQueriesTool(getOsqueryContext), createGetSavedQueryTool(getOsqueryContext)],
  };
};





