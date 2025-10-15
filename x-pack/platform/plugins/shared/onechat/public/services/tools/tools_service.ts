/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { ExecuteToolParams } from '@kbn/onechat-browser';
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
} from '../../../common/http_api/tools';
import { publicApiPath, internalApiPath } from '../../../common/constants';
import type { OAuthManager } from '../oauth';

export class ToolsService {
  private readonly http: HttpSetup;
  private readonly oauthManager?: OAuthManager;

  constructor({ http, oauthManager }: { http: HttpSetup; oauthManager?: OAuthManager }) {
    this.http = http;
    this.oauthManager = oauthManager;
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
    // Get tool definition to check if it's an MCP tool requiring OAuth
    let userMcpTokens: Record<string, string> | undefined;

    if (this.oauthManager && toolId.startsWith('mcp.')) {
      // Extract server ID from MCP tool ID (format: mcp.{serverId}.{toolName})
      const parts = toolId.split('.');
      if (parts.length >= 3) {
        const serverId = parts[1];

        try {
          // Try to get a valid OAuth token for this server
          const token = await this.oauthManager.getValidToken(serverId);

          if (token) {
            userMcpTokens = {
              [serverId]: token,
            };
            // eslint-disable-next-line no-console
            console.log(
              `Found valid OAuth token for MCP server: ${serverId}`,
              token.substring(0, 20) + '...'
            );
          } else {
            // No valid token - might need to initiate OAuth flow
            // For now, continue without token and let backend handle the 401
            console.warn(`No valid OAuth token found for MCP server: ${serverId}`);
          }
        } catch (error) {
          console.error(`Failed to get OAuth token for MCP server ${serverId}:`, error);
          // Continue without token
        }
      }
    }

    return await this.http.post<ExecuteToolResponse>(`${publicApiPath}/tools/_execute`, {
      body: JSON.stringify({
        tool_id: toolId,
        tool_params: toolParams,
        connector_id: connectorId,
        user_mcp_tokens: userMcpTokens,
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
}
