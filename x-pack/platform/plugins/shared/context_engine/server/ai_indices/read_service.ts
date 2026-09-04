/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/core-security-server';
import type {
  DescribeAiIndexResponse,
  QueryAiIndicesRequest,
  QueryAiIndicesResponse,
} from '../../common/http_api/ai_indices';
import { AiIndexAuditAction, aiIndexAuditEvent } from './audit_events';
import { describeAiIndex } from './describe';
import { AiIndexNotFoundError } from './errors';
import { queryAiIndices } from './query';
import type { AiIndexService } from './service';

/** Result, not thrown error: cross-plugin consumers need no `instanceof`. */
export type DescribeAiIndexResult =
  | { status: 'ok'; result: DescribeAiIndexResponse }
  | { status: 'not_found'; id: string };

/** Caller-scoped AI-index reads. One instance per request; shared by HTTP routes and agent tools. */
export interface AiIndexReadServiceApi {
  query(request: QueryAiIndicesRequest): Promise<QueryAiIndicesResponse>;
  describe(id: string): Promise<DescribeAiIndexResult>;
}

export class AiIndexReadService implements AiIndexReadServiceApi {
  constructor(
    private readonly deps: {
      esClient: ElasticsearchClient;
      spaceId: string;
      auditLogger: AuditLogger;
      aiIndexService: Pick<AiIndexService, 'get'>;
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

  async describe(id: string): Promise<DescribeAiIndexResult> {
    const { esClient, spaceId, auditLogger, aiIndexService } = this.deps;
    try {
      const aiIndex = await aiIndexService.get(id);
      const result = await describeAiIndex({ esClient, aiIndex, spaceId });
      auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.DESCRIBE, id }));
      return { status: 'ok', result };
    } catch (error) {
      auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.DESCRIBE, id, error }));
      if (error instanceof AiIndexNotFoundError) {
        return { status: 'not_found', id };
      }
      throw error;
    }
  }
}
