/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath, type HttpSetup } from '@kbn/core-http-browser';
import { agentBuilderDefaultAiIndexId, type ShortTermMemory } from '@kbn/agent-builder-common';
import type {
  DeleteAllShortTermMemoriesResponse,
  DeleteShortTermMemoryResponse,
  ListShortTermMemoriesResponse,
} from '../../../common/http_api/memory';
import {
  SHORT_TERM_MEMORY_KI_TYPE_PREFIX,
  toShortTermMemory,
} from '../../../common/short_term_memory';

const AI_INDEX_PATH = '/api/context_engine/ai_index';
const AI_INDEX_API_VERSION = '2023-10-31';
const KI_PATH = '/internal/context_engine/ai_index/{aiIndexId}/kis/{kiId}';
const KI_API_VERSION = '1';
const MAX_MEMORIES = 1000;

interface QueryResponse {
  columns: Array<{ name: string }>;
  values: unknown[][];
}

const asStrings = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return typeof value === 'string' ? [value] : [];
};

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asAttributes = (value: unknown): Record<string, string> =>
  value !== null && typeof value === 'object'
    ? Object.fromEntries(
        Object.entries(value).flatMap(([key, item]) =>
          typeof item === 'string' ? [[key, item]] : []
        )
      )
    : {};

/**
 * Short-term memories as Context Engine shows them to the caller: their own, or every user's for
 * an administrator. They are user-scoped documents of the Elastic AI index, read and deleted
 * through the generic AI index APIs.
 */
export class MemoryService {
  private readonly http: HttpSetup;
  private dest: Promise<string> | undefined;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  private getDest(): Promise<string> {
    this.dest ??= this.http
      .get<{ dest: { value: string } }>(
        buildPath(`${AI_INDEX_PATH}/{aiIndexId}`, { aiIndexId: agentBuilderDefaultAiIndexId }),
        { version: AI_INDEX_API_VERSION }
      )
      .then(({ dest }) => dest.value);
    return this.dest;
  }

  async list({ agentId }: { agentId?: string } = {}): Promise<ListShortTermMemoriesResponse> {
    const { columns, values } = await this.http.post<QueryResponse>(`${AI_INDEX_PATH}/_query`, {
      version: AI_INDEX_API_VERSION,
      body: JSON.stringify({
        query: `FROM ${await this.getDest()} | WHERE type LIKE ?type | SORT updated_at DESC | KEEP id, @timestamp, type, title, description, content, tags, updated_at, expires_at, attributes`,
        params: { type: `${SHORT_TERM_MEMORY_KI_TYPE_PREFIX}*` },
        limit: MAX_MEMORIES,
      }),
    });
    const names = columns.map(({ name }) => name);
    const results = values
      .map((row): ShortTermMemory => {
        const field = (name: string) => row[names.indexOf(name)];
        const expiresAt = field('expires_at');
        return toShortTermMemory({
          '@timestamp': asString(field('@timestamp')),
          id: asString(field('id')),
          type: asString(field('type')),
          title: asString(field('title')),
          description: asString(field('description')),
          content: asString(field('content')),
          tags: asStrings(field('tags')),
          updated_at: asString(field('updated_at')),
          ...(typeof expiresAt === 'string' && { expires_at: expiresAt }),
          attributes: asAttributes(field('attributes')),
        });
      })
      // ES|QL cannot filter on a flattened subfield, so the agent is matched here.
      .filter((memory) => agentId === undefined || memory.agent_id === agentId);
    return { results };
  }

  async delete({ id }: { id: string }): Promise<DeleteShortTermMemoryResponse> {
    await this.http.delete(
      buildPath(KI_PATH, { aiIndexId: agentBuilderDefaultAiIndexId, kiId: id }),
      { version: KI_API_VERSION }
    );
    return { id };
  }

  async deleteAll({
    agentId,
  }: { agentId?: string } = {}): Promise<DeleteAllShortTermMemoriesResponse> {
    const { results } = await this.list({ agentId });
    for (const { id } of results) {
      await this.delete({ id });
    }
    return { deleted: results.length };
  }
}
