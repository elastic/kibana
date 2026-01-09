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
import { packSavedObjectType } from '../../../common/types';
import type { PackSavedObject } from '../../common/types';
import { filter, map } from 'lodash';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { convertSOQueriesToPack } from '../../routes/pack/utils';
import { convertShardsToObject } from '../../routes/utils';

const PACKS_SKILL: Omit<Skill, 'tools'> = {
  namespace: 'osquery.packs',
  name: 'Osquery Packs',
  description: 'List and retrieve osquery packs',
  content: `# Osquery Packs Guide

This skill provides knowledge about working with osquery packs.

## Overview
Packs are collections of osquery queries that can be scheduled to run on agents. They allow you to organize related queries and apply them to specific agent policies.

## Key Concepts

### Pack Structure
- **name**: Unique name for the pack
- **description**: Human-readable description
- **queries**: Collection of queries with scheduling information
- **enabled**: Whether the pack is active
- **policy_ids**: Agent policies this pack is assigned to

### Query Scheduling
Each query in a pack can have:
- **interval**: How often to run (e.g., "3600" for hourly)
- **timeout**: Maximum execution time
- **snapshot**: Whether to use snapshot mode
- **removed**: Whether to track removed rows

## Usage Examples

### List all packs
\`\`\`
tool("list_packs", {
  page: 1,
  pageSize: 20
})
\`\`\`

### Get a specific pack
\`\`\`
tool("get_pack", {
  pack_id: "pack-uuid"
})
\`\`\`

## Best Practices
- Use packs to organize related queries
- Assign packs to appropriate agent policies
- Review pack queries before enabling
- Monitor pack execution for performance issues
`,
};

const createListPacksTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
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
      const [coreStart] = await osqueryContext.getStartServices();

      const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
        osqueryContext,
        request
      );

      const soClientResponse = await spaceScopedClient.find<PackSavedObject>({
        type: packSavedObjectType,
        page: page ?? 1,
        perPage: pageSize ?? 20,
        sortField: sort ?? 'updated_at',
        sortOrder: sortOrder ?? 'desc',
      });

      const packs = map(soClientResponse.saved_objects, (pack) => {
        const policyIds = map(
          filter(pack.references, ['type', LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE]),
          'id'
        );

        return {
          saved_object_id: pack.id,
          name: pack.attributes.name,
          description: pack.attributes.description,
          enabled: pack.attributes.enabled,
          created_at: pack.attributes.created_at,
          updated_at: pack.attributes.updated_at,
          policy_ids: policyIds,
        };
      });

      return JSON.stringify({
        data: packs,
        total: soClientResponse.total,
        page: soClientResponse.page,
        per_page: soClientResponse.per_page,
      });
    },
    {
      name: 'list_packs',
      description: 'List osquery packs with pagination support',
      schema: z.object({
        page: z.number().optional().describe('Page number (default: 1)'),
        pageSize: z.number().optional().describe('Number of items per page (default: 20)'),
        sort: z.string().optional().describe('Field to sort by (default: updated_at)'),
        sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)'),
      }),
    }
  );
};

const createGetPackTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({ pack_id }, config) => {
      const onechatContext = getOneChatContext(config);
      if (!onechatContext) {
        throw new Error('OneChat context not available');
      }

      const osqueryContext = getOsqueryContext();
      if (!osqueryContext) {
        throw new Error('Osquery context not available');
      }

      const { request } = onechatContext;

      const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
        osqueryContext,
        request
      );

      const { attributes, references, id, ...rest } =
        await spaceScopedClient.get<PackSavedObject>(packSavedObjectType, pack_id);

      const policyIds = map(
        filter(references, ['type', LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE]),
        'id'
      );
      const osqueryPackAssetReference = !!filter(references, ['type', 'osquery-pack-asset']);

      const data = {
        saved_object_id: id,
        name: attributes.name,
        description: attributes.description,
        version: attributes.version,
        enabled: attributes.enabled,
        created_at: attributes.created_at,
        created_by: attributes.created_by,
        updated_at: attributes.updated_at,
        updated_by: attributes.updated_by,
        queries: convertSOQueriesToPack(attributes.queries),
        shards: convertShardsToObject(attributes.shards),
        policy_ids: policyIds,
        read_only: attributes.version !== undefined && osqueryPackAssetReference,
        ...rest,
      };

      return JSON.stringify({ data });
    },
    {
      name: 'get_pack',
      description: 'Get details of a specific osquery pack by ID',
      schema: z.object({
        pack_id: z.string().describe('The pack ID to retrieve'),
      }),
    }
  );
};

export const getPacksSkill = (getOsqueryContext: GetOsqueryAppContextFn): Skill => {
  return {
    ...PACKS_SKILL,
    tools: [createListPacksTool(getOsqueryContext), createGetPackTool(getOsqueryContext)],
  };
};





