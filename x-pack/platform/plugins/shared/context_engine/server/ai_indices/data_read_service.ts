/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/core-security-server';
import type {
  AiIndexHttpItem,
  DescribeAiIndexResponse,
  QueryAiIndicesRequest,
  QueryAiIndicesResponse,
} from '../../common/http_api/ai_indices';
import { AiIndexAuditAction, aiIndexAuditEvent } from '../audit/audit_events';
import { describeAiIndex } from './describe';
import { filterReadableAiIndices } from './filter_readable_ai_indices';
import { queryAiIndices } from './query';
import type { AiIndexService } from './service';

/** Caller-scoped AI-index reads. One instance per request; shared by HTTP routes and agent tools. */
export interface AiIndexDataReadServiceApi {
  query(request: QueryAiIndicesRequest): Promise<QueryAiIndicesResponse>;
  /** Throws `AiIndexNotFoundError` for an unknown id. */
  describe(id: string): Promise<DescribeAiIndexResponse>;
  /**
   * The AI Indices registered in this space whose backing index the caller can read. An empty
   * backing index still counts. Left out when the caller cannot read it, or when the check itself
   * failed. `ids` limits which entries are checked.
   */
  list(ids?: string[]): Promise<AiIndexHttpItem[]>;
}

export class AiIndexDataReadService implements AiIndexDataReadServiceApi {
  constructor(
    private readonly deps: {
      esClient: ElasticsearchClient;
      spaceId: string;
      auditLogger: AuditLogger;
      aiIndexService: Pick<AiIndexService, 'get' | 'list'>;
      logger: Logger;
    }
  ) {}

  async query(request: QueryAiIndicesRequest): Promise<QueryAiIndicesResponse> {
    const { esClient, spaceId, auditLogger } = this.deps;
    try {
      const response = await queryAiIndices({ esClient, spaceId, ...request });
      auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.QUERY }));
      return response;
    } catch (error) {
      auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.QUERY, error }));
      throw error;
    }
  }

  async describe(id: string): Promise<DescribeAiIndexResponse> {
    const { esClient, spaceId, auditLogger, aiIndexService } = this.deps;
    try {
      const aiIndex = await aiIndexService.get(id, spaceId);
      const response = await describeAiIndex({ esClient, aiIndex, spaceId });
      auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.DESCRIBE, id }));
      return { response };
    } catch (error) {
      auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.DESCRIBE, id, error }));
      throw error;
    }
  }

  async list(ids?: string[]): Promise<AiIndexHttpItem[]> {
    const { esClient, spaceId, auditLogger, aiIndexService, logger } = this.deps;
    try {
      const registry = await aiIndexService.list(spaceId);
      const requested = ids && new Set(ids);
      const aiIndices = requested ? registry.filter(({ id }) => requested.has(id)) : registry;
      const readable = await filterReadableAiIndices({ esClient, aiIndices, logger });
      auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.LIST }));
      return readable;
    } catch (error) {
      auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.LIST, error }));
      throw error;
    }
  }
}
