/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { listSearchSources } from '@kbn/onechat-genai-utils';
import { CONNECTOR_ID as MCP_CONNECTOR_ID } from '@kbn/connector-schemas/mcp/constants';
import type { ListToolsResponse } from '@kbn/mcp-client';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  BulkDeleteToolResponse,
  BulkDeleteToolResult,
  ResolveSearchSourcesResponse,
  ListWorkflowsResponse,
  GetWorkflowResponse,
  GetToolTypeInfoResponse,
  GetToolHealthResponse,
  ListToolHealthResponse,
  ListConnectorsResponse,
  ConnectorItem,
  ListMcpToolsResponse,
  GetConnectorResponse,
} from '../../../common/http_api/tools';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';
import { getToolTypeInfo } from '../../services/tools/utils';
import { toConnectorItem } from '../utils';

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

  // list connectors (internal)
  router.get(
    {
      path: `${internalApiPath}/tools/_list_connectors`,
      validate: {
        query: schema.object({
          type: schema.maybe(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const [, pluginsStart] = await coreSetup.getStartServices();
      const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);
      const allConnectors = await actionsClient.getAll();

      const { type } = request.query;

      const connectors: ConnectorItem[] = allConnectors
        .filter((connector) => (type ? connector.actionTypeId === type : true))
        .map(toConnectorItem);

      return response.ok<ListConnectorsResponse>({
        body: {
          connectors,
        },
      });
    })
  );

  // get connector by ID (internal)
  router.get(
    {
      path: `${internalApiPath}/tools/_get_connector/{connectorId}`,
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const [, pluginsStart] = await coreSetup.getStartServices();
      const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);
      const { connectorId } = request.params;

      const connector = await actionsClient.get({ id: connectorId });

      return response.ok<GetConnectorResponse>({
        body: {
          connector: toConnectorItem(connector),
        },
      });
    })
  );

  // list MCP tools (internal)
  router.get(
    {
      path: `${internalApiPath}/tools/_list_mcp_tools`,
      validate: {
        query: schema.object({
          connectorId: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const [, pluginsStart] = await coreSetup.getStartServices();
      const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);

      const { connectorId } = request.query;

      const connector = await actionsClient.get({ id: connectorId });

      if (connector.actionTypeId !== MCP_CONNECTOR_ID) {
        response.badRequest({
          body: {
            message: `Connector '${connectorId}' is not an MCP connector. Expected type '${MCP_CONNECTOR_ID}', got '${connector.actionTypeId}'`,
          },
        });
      }

      const executeResult = (await actionsClient.execute({
        actionId: request.query.connectorId,
        params: {
          subAction: 'listTools',
        },
      })) as ActionTypeExecutorResult<ListToolsResponse>;

      if (executeResult.status === 'error') {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to list MCP tools for connector '${connectorId}': ${executeResult.message}`,
          },
        });
      }

      const mcpTools = executeResult.data?.tools ?? [];

      return response.ok<ListMcpToolsResponse>({
        body: {
          mcpTools,
        },
      });
    })
  );
}
