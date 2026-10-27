/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath, type HttpSetup } from '@kbn/core-http-browser';
import type {
  DeleteAllShortTermMemoriesResponse,
  DeleteShortTermMemoryResponse,
  ListShortTermMemoriesResponse,
} from '../../../common/http_api/memory';
import { internalApiPath } from '../../../common/constants';

const MEMORY_PATH = `${internalApiPath}/memory`;

/** The current user's short-term memories. The server only ever returns the caller's own. */
export class MemoryService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list({ agentId }: { agentId?: string } = {}): Promise<ListShortTermMemoriesResponse> {
    return await this.http.get<ListShortTermMemoriesResponse>(MEMORY_PATH, {
      query: { ...(agentId !== undefined && { agent_id: agentId }), limit: 100 },
    });
  }

  async delete({ id }: { id: string }): Promise<DeleteShortTermMemoryResponse> {
    return await this.http.delete<DeleteShortTermMemoryResponse>(
      buildPath(`${internalApiPath}/memory/{id}`, { id })
    );
  }

  async deleteAll({
    agentId,
  }: { agentId?: string } = {}): Promise<DeleteAllShortTermMemoriesResponse> {
    return await this.http.delete<DeleteAllShortTermMemoriesResponse>(MEMORY_PATH, {
      query: agentId !== undefined ? { agent_id: agentId } : {},
    });
  }
}
