/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { OpencodeRunProgress } from '../types';
import {
  createStorage,
  opencodeRunIndexName,
  type OpencodeRunProperties,
  type OpencodeRunStatus,
  type OpencodeRunStorage,
} from './run_storage';

export interface CreateRunParams {
  runId: string;
  conversationId: string;
  agentId?: string;
  executionId?: string;
  spaceId: string;
  prompt?: string;
  podName: string;
  provider?: string;
  kubeContext: string;
  namespace: string;
}

export interface OpencodeRunSummary {
  runId: string;
  conversationId: string;
  status: OpencodeRunStatus;
  podName: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

export interface OpencodeRun extends OpencodeRunSummary {
  agentId?: string;
  executionId?: string;
  spaceId: string;
  prompt?: string;
  answer?: string;
  error?: string;
  provider?: string;
  kubeContext: string;
  namespace: string;
  timeline: OpencodeRunProgress[];
}

const toSummary = (s: OpencodeRunProperties): OpencodeRunSummary => ({
  runId: s.run_id,
  conversationId: s.conversation_id,
  status: s.status,
  podName: s.pod_name,
  createdAt: s['@timestamp'],
  updatedAt: s.updated_at,
  itemCount: s.item_count ?? s.timeline?.length ?? 0,
});

const toRun = (s: OpencodeRunProperties): OpencodeRun => ({
  ...toSummary(s),
  agentId: s.agent_id,
  executionId: s.execution_id,
  spaceId: s.space_id,
  prompt: s.prompt,
  answer: s.answer,
  error: s.error,
  provider: s.provider,
  kubeContext: s.kube_context,
  namespace: s.namespace,
  timeline: s.timeline ?? [],
});

/**
 * Read/write access to persisted OpenCode runs. Writes use the internal user
 * (like AgentExecutionClient), since runs happen server-side and are keyed by
 * conversation + space for later inspection.
 */
export class OpencodeRunClient {
  private readonly storage: OpencodeRunStorage;

  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {
    this.storage = createStorage({ esClient, logger });
  }

  async create(params: CreateRunParams): Promise<void> {
    const now = new Date().toISOString();
    const document: OpencodeRunProperties = {
      run_id: params.runId,
      conversation_id: params.conversationId,
      agent_id: params.agentId,
      execution_id: params.executionId,
      space_id: params.spaceId,
      '@timestamp': now,
      updated_at: now,
      status: 'running',
      prompt: params.prompt,
      pod_name: params.podName,
      provider: params.provider,
      kube_context: params.kubeContext,
      namespace: params.namespace,
      timeline: [],
    };
    await this.storage.getClient().index({ id: params.runId, document });
  }

  /** Overwrite the timeline (bounded, so a full re-index is fine for a PoC). */
  async updateTimeline(runId: string, timeline: OpencodeRunProgress[]): Promise<void> {
    await this.esClient.update({
      index: opencodeRunIndexName,
      id: runId,
      doc: { timeline, item_count: timeline.length, updated_at: new Date().toISOString() },
    });
  }

  async finish(
    runId: string,
    result: {
      status: OpencodeRunStatus;
      answer?: string;
      error?: string;
      timeline: OpencodeRunProgress[];
    }
  ): Promise<void> {
    await this.esClient.update({
      index: opencodeRunIndexName,
      id: runId,
      doc: {
        status: result.status,
        answer: result.answer,
        error: result.error,
        timeline: result.timeline,
        item_count: result.timeline.length,
        updated_at: new Date().toISOString(),
      },
    });
  }

  async get(runId: string): Promise<OpencodeRun | undefined> {
    try {
      const response = await this.esClient.get<OpencodeRunProperties>({
        index: opencodeRunIndexName,
        id: runId,
      });
      return response._source ? toRun(response._source) : undefined;
    } catch (err) {
      if (err?.meta?.statusCode === 404) return undefined;
      throw err;
    }
  }

  async listByConversation(
    conversationId: string,
    { spaceId, size = 50 }: { spaceId: string; size?: number }
  ): Promise<OpencodeRunSummary[]> {
    const must: QueryDslQueryContainer[] = [
      { term: { conversation_id: conversationId } },
      { term: { space_id: spaceId } },
    ];
    try {
      const response = await this.esClient.search<OpencodeRunProperties>({
        index: opencodeRunIndexName,
        size,
        sort: [{ '@timestamp': { order: 'asc' } }],
        _source_excludes: ['timeline'],
        query: { bool: { must } },
      });
      return response.hits.hits.flatMap((hit) => (hit._source ? [toSummary(hit._source)] : []));
    } catch (err) {
      // Index may not exist yet (no runs ever written); treat as empty.
      if (err?.meta?.statusCode === 404) return [];
      this.logger.warn(`Failed to list opencode runs: ${(err as Error).message}`);
      return [];
    }
  }
}
