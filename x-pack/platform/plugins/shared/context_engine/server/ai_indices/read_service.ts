/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/core-security-server';
import type {
  QueryAiIndicesRequest,
  QueryAiIndicesResponse,
} from '../../common/http_api/ai_indices';
import { AiIndexAuditAction, aiIndexAuditEvent } from '../routes/audit_events';
import { queryAiIndices } from './query';

/** Caller-scoped AI-index reads. One instance per request; shared by HTTP routes and agent tools. */
export interface AiIndexReadServiceApi {
  query(request: QueryAiIndicesRequest): Promise<QueryAiIndicesResponse>;
}

export class AiIndexReadService implements AiIndexReadServiceApi {
  constructor(
    private readonly deps: {
      esClient: ElasticsearchClient;
      spaceId: string;
      auditLogger: AuditLogger;
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
}
