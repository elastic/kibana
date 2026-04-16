/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  MemoryNode,
  MemoryType,
  MemoryStatus,
  RetrievalStage,
  MemoryLink,
  MemorySourceRef,
} from '@kbn/agent-builder-common';
import { internalApiPath } from '../../../common/constants';

const MEMORY_BASE_PATH = `${internalApiPath}/memory`;

export interface MemoryListParams {
  type?: MemoryType;
  status?: MemoryStatus;
  size?: number;
  from?: number;
}

export interface MemoryListResponse {
  results: MemoryNode[];
  total: number;
}

export interface MemorySearchParams {
  query: string;
  stage?: RetrievalStage;
  limit?: number;
}

export interface MemorySearchResponse {
  results: MemoryNode[];
  total: number;
  query: string;
  stage: RetrievalStage;
}

export interface MemoryGraphNode {
  id: string;
  summary: string;
  type: MemoryType;
  status: MemoryStatus;
  confidence: number;
}

export interface MemoryGraphEdge {
  source_id: string;
  target_id: string;
  type: string;
  weight: number;
}

export interface MemoryGraphResponse {
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
}

export interface MemoryStatsResponse {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

export interface MemoryReviewItem {
  id: string;
  memory_id: string;
  reason: string;
  priority: number;
  enqueued_at: string;
}

export interface MemoryReviewQueueResponse {
  items: MemoryReviewItem[];
  total: number;
}

export interface MemoryResolveReviewParams {
  action: 'approve' | 'reject' | 'merge';
  merge_target_id?: string;
}

export interface MemoryResolveReviewResponse {
  success: boolean;
  action: string;
  memory_id: string;
  review_item_id: string;
}

export interface MemoryConsolidationResponse {
  success: boolean;
  task_id: string;
  message?: string;
}

export interface MemoryCreateParams {
  type: MemoryType;
  subtype?: string;
  summary: string;
  full: string;
  confidence: number;
  salience?: number;
  utility?: number;
  stability?: number;
  status?: MemoryStatus;
  source_refs?: MemorySourceRef[];
  links?: MemoryLink[];
}

export interface MemoryUpdateParams {
  summary?: string;
  full?: string;
  confidence?: number;
  salience?: number;
  utility?: number;
  stability?: number;
  status?: MemoryStatus;
  source_refs?: MemorySourceRef[];
  links?: MemoryLink[];
}

export interface MemoryDeleteResponse {
  success: boolean;
  id: string;
}

export class MemoryService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list(params: MemoryListParams = {}): Promise<MemoryListResponse> {
    return await this.http.get<MemoryListResponse>(MEMORY_BASE_PATH, {
      query: {
        type: params.type,
        status: params.status,
        size: params.size ?? 20,
        from: params.from ?? 0,
      },
    });
  }

  async get(id: string): Promise<MemoryNode> {
    return await this.http.get<MemoryNode>(`${MEMORY_BASE_PATH}/${id}`);
  }

  async create(body: MemoryCreateParams): Promise<MemoryNode> {
    return await this.http.post<MemoryNode>(MEMORY_BASE_PATH, {
      body: JSON.stringify(body),
    });
  }

  async update(id: string, body: MemoryUpdateParams): Promise<MemoryNode> {
    return await this.http.put<MemoryNode>(`${MEMORY_BASE_PATH}/${id}`, {
      body: JSON.stringify(body),
    });
  }

  async delete(id: string): Promise<MemoryDeleteResponse> {
    return await this.http.delete<MemoryDeleteResponse>(`${MEMORY_BASE_PATH}/${id}`);
  }

  async deleteAll(): Promise<{ success: boolean; deleted: number }> {
    return await this.http.delete<{ success: boolean; deleted: number }>(MEMORY_BASE_PATH);
  }

  async search(params: MemorySearchParams): Promise<MemorySearchResponse> {
    return await this.http.post<MemorySearchResponse>(`${MEMORY_BASE_PATH}/search`, {
      body: JSON.stringify({
        query: params.query,
        stage: params.stage,
        limit: params.limit ?? 10,
      }),
    });
  }

  async getGraph(
    id: string,
    opts: { depth?: number; edge_types?: string } = {}
  ): Promise<MemoryGraphResponse> {
    return await this.http.get<MemoryGraphResponse>(`${MEMORY_BASE_PATH}/${id}/graph`, {
      query: {
        depth: opts.depth ?? 2,
        edge_types: opts.edge_types,
      },
    });
  }

  async getStats(): Promise<MemoryStatsResponse> {
    return await this.http.get<MemoryStatsResponse>(`${MEMORY_BASE_PATH}/stats`);
  }

  async getReviewQueue(params: { limit?: number } = {}): Promise<MemoryReviewQueueResponse> {
    return await this.http.get<MemoryReviewQueueResponse>(`${MEMORY_BASE_PATH}/review_queue`, {
      query: { limit: params.limit ?? 20 },
    });
  }

  async resolveReview(
    id: string,
    params: MemoryResolveReviewParams
  ): Promise<MemoryResolveReviewResponse> {
    return await this.http.post<MemoryResolveReviewResponse>(`${MEMORY_BASE_PATH}/review/${id}`, {
      body: JSON.stringify({
        action: params.action,
        merge_target_id: params.merge_target_id,
      }),
    });
  }

  async triggerConsolidation(): Promise<MemoryConsolidationResponse> {
    return await this.http.post<MemoryConsolidationResponse>(`${MEMORY_BASE_PATH}/consolidate`);
  }
}
