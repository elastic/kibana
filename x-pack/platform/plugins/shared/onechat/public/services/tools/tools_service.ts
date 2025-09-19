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
} from '../../../common/http_api/tools';
import { publicApiPath, internalApiPath } from '../../../common/constants';

export class ToolsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

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

  async bulkDelete(toolsIds: string[]) {
    return await this.http.post<BulkDeleteToolResponse>(`${internalApiPath}/tools/_bulk_delete`, {
      body: JSON.stringify({ ids: toolsIds }),
    });
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

  async resolveSearchSources({ pattern }: { pattern: string }) {
    return await this.http.get<ResolveSearchSourcesResponse>(
      `${internalApiPath}/tools/_resolve_search_sources`,
      { query: { pattern } }
    );
  }
}
