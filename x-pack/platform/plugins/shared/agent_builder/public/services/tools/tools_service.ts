/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { ExecuteToolParams } from '@kbn/agent-builder-browser';
import type {
  ListToolsResponse,
  GetToolResponse,
  DeleteToolResponse,
  CreateToolPayload,
  UpdateToolPayload,
  CreateToolResponse,
  UpdateToolResponse,
  BulkDeleteToolResponse,
  ExecuteToolResponse,
  ResolveSearchSourcesResponse,
  ListWorkflowsResponse,
  GetWorkflowResponse,
  GetToolTypeInfoResponse,
  ListConnectorsResponse,
  ListMcpToolsResponse,
  GetConnectorResponse,
  GetToolHealthResponse,
  ListToolHealthResponse,
  ListMcpToolsHealthResponse,
  BulkCreateMcpToolsResponse,
  ValidateNamespaceResponse,
} from '../../../common/http_api/tools';
import { publicApiPath, internalApiPath } from '../../../common/constants';

export class ToolsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  // public APIs

  async list() {
    const { results } = await this.http.get<ListToolsResponse>(`${publicApiPath}/tools`, {});
    return results;
  }

  async get({ toolId }: { toolId: string }) {
    return await this.http.get<GetToolResponse>(`${publicApiPath}/tools/${toolId}`, {});
  }

  async delete({ toolId }: { toolId: string }) {
    return await this.http.delete<DeleteToolResponse>(`${publicApiPath}/tools/${toolId}`, {});
  }

  async create(tool: CreateToolPayload) {
    return await this.http.post<CreateToolResponse>(`${publicApiPath}/tools`, {
      body: JSON.stringify(tool),
    });
  }

  async update(id: string, update: UpdateToolPayload) {
    return await this.http.put<UpdateToolResponse>(`${publicApiPath}/tools/${id}`, {
      body: JSON.stringify(update),
    });
  }

  async execute({ toolId, toolParams, connectorId }: ExecuteToolParams) {
    return await this.http.post<ExecuteToolResponse>(`${publicApiPath}/tools/_execute`, {
      body: JSON.stringify({
        tool_id: toolId,
        tool_params: toolParams,
        connector_id: connectorId,
      }),
    });
  }

  // internal APIs

  async bulkDelete(toolsIds: string[]) {
    return await this.http.post<BulkDeleteToolResponse>(`${internalApiPath}/tools/_bulk_delete`, {
      body: JSON.stringify({ ids: toolsIds }),
    });
  }

  async resolveSearchSources({ pattern }: { pattern: string }) {
    return await this.http.get<ResolveSearchSourcesResponse>(
      `${internalApiPath}/tools/_resolve_search_sources`,
      { query: { pattern } }
    );
  }

  async getWorkflow(workflowId: string) {
    return await this.http.get<GetWorkflowResponse>(
      `${internalApiPath}/tools/_get_workflow/${workflowId}`
    );
  }

  async listWorkflows({ page, limit }: { page?: number; limit?: number }) {
    return await this.http.get<ListWorkflowsResponse>(`${internalApiPath}/tools/_list_workflows`, {
      query: { page, limit },
    });
  }

  async getToolTypes() {
    const response = await this.http.get<GetToolTypeInfoResponse>(
      `${internalApiPath}/tools/_types_info`
    );
    return response.toolTypes;
  }

  async listConnectors({ type }: { type?: string }) {
    return await this.http.get<ListConnectorsResponse>(
      `${internalApiPath}/tools/_list_connectors`,
      { query: { type } }
    );
  }

  async getConnector({ connectorId }: { connectorId: string }) {
    return await this.http.get<GetConnectorResponse>(
      `${internalApiPath}/tools/_get_connector/${connectorId}`
    );
  }

  async listMcpTools({ connectorId }: { connectorId: string }) {
    return await this.http.get<ListMcpToolsResponse>(`${internalApiPath}/tools/_list_mcp_tools`, {
      query: { connectorId },
    });
  }

  async listToolsHealth() {
    return await this.http.get<ListToolHealthResponse>(`${internalApiPath}/tools/_health`);
  }

  async getToolHealth({ toolId }: { toolId: string }) {
    return await this.http.get<GetToolHealthResponse>(`${internalApiPath}/tools/${toolId}/_health`);
  }

  async listMcpToolsHealth() {
    return await this.http.get<ListMcpToolsHealthResponse>(`${internalApiPath}/tools/_mcp_health`);
  }

  async bulkCreateMcpTools({
    connectorId,
    tools,
    namespace,
    tags,
    skipExisting = true,
  }: {
    connectorId: string;
    tools: Array<{ name: string; description?: string }>;
    namespace?: string;
    tags?: string[];
    skipExisting?: boolean;
  }) {
    return await this.http.post<BulkCreateMcpToolsResponse>(
      `${internalApiPath}/tools/_bulk_create_mcp`,
      {
        body: JSON.stringify({
          connector_id: connectorId,
          tools,
          namespace,
          tags,
          skip_existing: skipExisting,
        }),
      }
    );
  }

  async validateNamespace({ namespace, connectorId }: { namespace: string; connectorId?: string }) {
    return await this.http.get<ValidateNamespaceResponse>(
      `${internalApiPath}/tools/_validate_namespace`,
      { query: { namespace, connector_id: connectorId } }
    );
  }
}
