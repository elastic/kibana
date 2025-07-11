/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  ListToolsResponse,
  GetToolResponse,
  DeleteToolResponse,
  CreateToolPayload,
  UpdateToolPayload,
  CreateToolResponse,
  UpdateToolResponse,
} from '../../../common/http_api/tools';

export class ToolsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list() {
    const { results } = await this.http.get<ListToolsResponse>('/api/chat/tools', {});
    return results;
  }

  async get({ toolId }: { toolId: string }) {
    return await this.http.get<GetToolResponse>(`/api/chat/tools/${toolId}`, {});
  }

  async delete({ toolId }: { toolId: string }) {
    return await this.http.delete<DeleteToolResponse>(`/api/chat/tools/${toolId}`, {});
  }

  async create(tool: CreateToolPayload) {
    return await this.http.post<CreateToolResponse>('/api/chat/tools', {
      body: JSON.stringify(tool),
    });
  }

  async update(id: string, update: UpdateToolPayload) {
    return await this.http.put<UpdateToolResponse>(`/api/chat/tools/${id}`, {
      body: JSON.stringify(update),
    });
  }
}
