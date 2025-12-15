/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { listSearchSources } from '@kbn/onechat-genai-utils';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { ToolType, validateToolId } from '@kbn/onechat-common';
import type {
  BulkDeleteToolResponse,
  BulkDeleteToolResult,
  ResolveSearchSourcesResponse,
  ListWorkflowsResponse,
  GetWorkflowResponse,
  GetToolTypeInfoResponse,
  GetToolHealthResponse,
  ListToolHealthResponse,
  BulkCreateMcpToolsResponse,
  BulkCreateMcpToolResult,
} from '../../../common/http_api/tools';
import { validateConnector } from '../../services/tools/tool_types/mcp/validate_configuration';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';
import { getToolTypeInfo } from '../../services/tools/utils';

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
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
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

  // bulk create MCP tools from connector (internal)
  router.post(
    {
      path: `${internalApiPath}/tools/_bulk_create_mcp`,
      validate: {
        body: schema.object({
          connector_id: schema.string(),
          tools: schema.arrayOf(
            schema.object({
              name: schema.string(),
              description: schema.maybe(schema.string()),
            })
          ),
          namespace: schema.maybe(schema.string()),
          tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
          skip_existing: schema.boolean({ defaultValue: true }),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { connector_id: connectorId, tools, namespace, tags, skip_existing: skipExisting } =
        request.body;
      const { tools: toolService } = getInternalServices();
      const [, { actions }] = await coreSetup.getStartServices();
      const registry = await toolService.getRegistry({ request });

      // Validate namespace if provided (must be valid tool ID segment)
      if (namespace) {
        const namespaceError = validateToolId({ toolId: namespace, builtIn: false });
        if (namespaceError) {
          return response.badRequest({
            body: { message: `Invalid namespace: ${namespaceError}` },
          });
        }
      }

      // Validate connector is MCP type
      await validateConnector({
        actions,
        request,
        connectorId,
      });

      // Precompute tool metadata (toolId, mcpToolName) once per tool
      // MCP tool names are server-generated and typically well-formed (e.g., snake_case)
      // We just lowercase them; validation in registry.create() handles edge cases
      const toolsWithIds = tools.map((tool) => {
        const toolName = tool.name.toLowerCase();
        const toolId = namespace ? `${namespace}.${toolName}` : toolName;
        return { toolId, mcpToolName: tool.name, description: tool.description };
      });

      // Process tools in parallel using Promise.allSettled (matches bulk delete pattern)
      const createResults = await Promise.allSettled(
        toolsWithIds.map(async ({ toolId, mcpToolName, description }) => {
          // Check if tool already exists
          const exists = await registry.has(toolId);
          if (exists && skipExisting) {
            return { toolId, mcpToolName, skipped: true as const };
          }

          // Create the MCP tool
          await registry.create({
            id: toolId,
            type: ToolType.mcp,
            description: description ?? '',
            tags,
            configuration: {
              connector_id: connectorId,
              tool_name: mcpToolName,
            },
          });

          return { toolId, mcpToolName, skipped: false as const };
        })
      );

      // Map results to response format (matches bulk delete pattern)
      const results: BulkCreateMcpToolResult[] = createResults.map((result, index) => {
        const { toolId, mcpToolName } = toolsWithIds[index];

        if (result.status === 'rejected') {
          return {
            toolId,
            mcpToolName,
            success: false as const,
            reason: result.reason?.toJSON?.() ?? {
              error: { message: result.reason?.message ?? 'Unknown error' },
            },
          };
        }

        if (result.value.skipped) {
          return {
            toolId: result.value.toolId,
            mcpToolName: result.value.mcpToolName,
            success: true as const,
            skipped: true as const,
          };
        }

        return {
          toolId: result.value.toolId,
          mcpToolName: result.value.mcpToolName,
          success: true as const,
        };
      });

      // Compute summary counts
      const summary = results.reduce(
        (acc, r) => {
          if (!r.success) acc.failed++;
          else if ('skipped' in r && r.skipped) acc.skipped++;
          else acc.created++;
          return acc;
        },
        { total: results.length, created: 0, skipped: 0, failed: 0 }
      );

      return response.ok<BulkCreateMcpToolsResponse>({
        body: {
          results,
          summary,
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
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
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
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { tools } = getInternalServices();

      const toolTypes = tools.getToolDefinitions();

      return response.ok<GetToolTypeInfoResponse>({
        body: {
          toolTypes: getToolTypeInfo(toolTypes),
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
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
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

      const currentSpace = (await ctx.onechat).spaces.getSpaceId();

      const { results } = await workflowsManagement.management.getWorkflows(
        { page: request.query.page, size: request.query.limit, enabled: [true] },
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
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
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

      const currentSpace = (await ctx.onechat).spaces.getSpaceId();

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

  // list all tool health statuses for the current space (internal)
  router.get(
    {
      path: `${internalApiPath}/tools/_health`,
      validate: false,
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { tools } = getInternalServices();
      const healthClient = tools.getHealthClient({ request });
      const healthStates = await healthClient.listBySpace();

      return response.ok<ListToolHealthResponse>({
        body: {
          results: healthStates,
        },
      });
    })
  );

  // get health status for a specific tool (internal)
  router.get(
    {
      path: `${internalApiPath}/tools/{toolId}/_health`,
      validate: {
        params: schema.object({
          toolId: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { tools } = getInternalServices();
      const healthClient = tools.getHealthClient({ request });
      const health = await healthClient.get(request.params.toolId);

      if (!health) {
        return response.notFound({
          body: { message: `No health data found for tool '${request.params.toolId}'` },
        });
      }

      return response.ok<GetToolHealthResponse>({
        body: { health },
      });
    })
  );
}
