/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { listSearchSources } from '@kbn/agent-builder-genai-utils';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  BulkDeleteToolResponse,
  BulkDeleteToolResult,
  ResolveSearchSourcesResponse,
  ListWorkflowsResponse,
  GetWorkflowResponse,
  GetToolTypeInfoResponse,
} from '../../../common/http_api/tools';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';

export function registerInternalToolsRoutes({
  router,
  coreSetup,
  getInternalServices,
  logger,
  pluginsSetup: { workflowsManagement },
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // bulk delete tools
  router.post(
    {
      path: `${internalApiPath}/tools/_bulk_delete`,
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { ids } = request.body;
      const { tools: toolService } = getInternalServices();
      const registry = await toolService.getRegistry({ request });
      const deleteResults = await Promise.allSettled(ids.map((id) => registry.delete(id)));

      const results: BulkDeleteToolResult[] = deleteResults.map((result, index) => {
        if (result.status !== 'fulfilled') {
          return {
            toolId: ids[index],
            success: false,
            reason: result.reason.toJSON?.() ?? {
              error: { message: 'Unknown error' },
            },
          };
        }

        return {
          toolId: ids[index],
          success: true,
        };
      });

      return response.ok<BulkDeleteToolResponse>({
        body: {
          results,
        },
      });
    })
  );

  // resolve search sources (internal)
  router.get(
    {
      path: `${internalApiPath}/tools/_resolve_search_sources`,
      validate: {
        query: schema.object({
          pattern: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
      const { pattern } = request.query;

      const {
        indices,
        aliases,
        data_streams: dataStreams,
      } = await listSearchSources({
        pattern,
        includeHidden: false,
        includeKibanaIndices: false,
        excludeIndicesRepresentedAsAlias: true,
        excludeIndicesRepresentedAsDatastream: true,
        esClient,
      });

      const results = [
        ...indices.map((i) => ({ type: 'index' as const, name: i.name })),
        ...aliases.map((a) => ({ type: 'alias' as const, name: a.name })),
        ...dataStreams.map((d) => ({ type: 'data_stream' as const, name: d.name })),
      ];
      return response.ok<ResolveSearchSourcesResponse>({
        body: {
          results,
          total: results.length,
        },
      });
    })
  );

  // list available tool types (internal)
  router.get(
    {
      path: `${internalApiPath}/tools/_types_info`,
      validate: false,
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { tools } = getInternalServices();

      const toolTypes = tools.getToolTypeInfo();

      return response.ok<GetToolTypeInfoResponse>({
        body: {
          toolTypes,
        },
      });
    })
  );

  // list workflows (internal)
  router.get(
    {
      path: `${internalApiPath}/tools/_list_workflows`,
      validate: {
        query: schema.object({
          page: schema.number({ defaultValue: 1 }),
          limit: schema.number({ defaultValue: 10000 }),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      if (!workflowsManagement) {
        return response.ok<ListWorkflowsResponse>({
          body: {
            results: [],
          },
        });
      }

      const currentSpace = (await ctx.agentBuilder).spaces.getSpaceId();

      const { results } = await workflowsManagement.management.getWorkflows(
        { page: request.query.page, limit: request.query.limit, enabled: [true] },
        currentSpace
      );

      return response.ok<ListWorkflowsResponse>({
        body: {
          results: results.map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
          })),
        },
      });
    })
  );

  // get workflow (internal)
  router.get(
    {
      path: `${internalApiPath}/tools/_get_workflow/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      if (!workflowsManagement) {
        return response.ok<GetWorkflowResponse>({
          body: {
            id: '',
            name: '',
            description: '',
          },
        });
      }

      const currentSpace = (await ctx.agentBuilder).spaces.getSpaceId();

      const workflow = await workflowsManagement.management.getWorkflow(
        request.params.id,
        currentSpace
      );

      return response.ok<GetWorkflowResponse>({
        body: {
          id: workflow!.id,
          name: workflow!.name,
          description: workflow!.description,
        },
      });
    })
  );
}
