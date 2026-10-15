/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/core-security-server';
import { isIndexPattern } from '../../common/ai_index_dest';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import type { MemoryType } from '../../common/memory';
import { isMemoryType } from '../../common/memory';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import { MemoryAuditAction, memoryAuditEvent } from '../audit/audit_events';
import type { AiIndexService } from './service';
import { kiIdQuery, pickCurrentRevision, REVISION_TIE_WINDOW } from './ki_get';
import type { MemoryReference, MemoryWriter, StoredMemoryDocument } from './memory_document';
import { updateMemoryProvenance } from './memory_document';
import { MemoryWriteError } from './memory_write_errors';

const DEFAULT_MEMORY_EXPIRATION_MS = 90 * 24 * 60 * 60 * 1000;

export interface MemoryContent {
  type: MemoryType;
  title: string;
  description: string;
  content: string;
  tags?: string[];
  expiresAt?: string | null;
}

export interface CreateMemoryRequest extends MemoryContent {
  aiIndexId: string;
  sessionId: string;
  writer: MemoryWriter;
  references?: MemoryReference[];
}

export interface ReviseMemoryRequest extends CreateMemoryRequest {
  id: string;
}

export interface ForgetMemoryRequest {
  aiIndexId: string;
  id: string;
  writer: MemoryWriter;
}

export interface MemoryWriteResult {
  id: string;
  sessionId: string;
}

export interface ForgetMemoryResult {
  id: string;
}

export interface AiIndexMemoryWriteServiceApi {
  createMemory(request: CreateMemoryRequest): Promise<MemoryWriteResult>;
  reviseMemory(request: ReviseMemoryRequest): Promise<MemoryWriteResult>;
  forgetMemory(request: ForgetMemoryRequest): Promise<ForgetMemoryResult>;
}

interface ExistingMemory {
  backingIndex: string;
  documentId: string;
  seqNo?: number;
  primaryTerm?: number;
  document: StoredMemoryDocument;
}

/** Caller-scoped Memory writes shared by tools and public APIs. */
export class AiIndexMemoryWriteService implements AiIndexMemoryWriteServiceApi {
  constructor(
    private readonly deps: {
      esClient: ElasticsearchClient;
      spaceId: string;
      auditLogger: AuditLogger;
      aiIndexService: Pick<AiIndexService, 'get'>;
      isMemoryEnabled: () => Promise<boolean>;
      generateId?: () => string;
      generateRevisionId?: () => string;
      getCurrentDate?: () => Date;
    }
  ) {}

  async createMemory(request: CreateMemoryRequest): Promise<MemoryWriteResult> {
    return this.withAudit(MemoryAuditAction.CREATE, request.aiIndexId, undefined, async () => {
      const aiIndex = await this.getWritableMemoryAiIndex(request.aiIndexId);
      const id = (this.deps.generateId ?? randomUUID)();
      const document = this.createDocument({ request, aiIndex, id });

      await this.deps.esClient.index({
        index: aiIndex.dest.value,
        id: aiIndex.dest.type === 'index' ? id : this.createDataStreamDocumentId(),
        document,
        op_type: 'create',
        refresh: 'wait_for',
      });

      return { id, sessionId: request.sessionId };
    });
  }

  async reviseMemory(request: ReviseMemoryRequest): Promise<MemoryWriteResult> {
    return this.withAudit(MemoryAuditAction.REVISE, request.aiIndexId, request.id, async () => {
      const aiIndex = await this.getWritableMemoryAiIndex(request.aiIndexId);
      const existing = await this.getExistingMemory(aiIndex, request.aiIndexId, request.id);

      if (existing.document.governance?.lifecycle?.status === 'deleted') {
        throw new MemoryWriteError(
          'memory_deleted',
          `Memory '${request.id}' was deleted and cannot be revised.`
        );
      }
      if (existing.document.type !== request.type) {
        throw new MemoryWriteError(
          'memory_type_mismatch',
          `Memory '${request.id}' has type '${existing.document.type}' and cannot be revised as '${request.type}'.`
        );
      }

      const document = this.createDocument({
        request,
        aiIndex,
        id: request.id,
        existingDocument: existing.document,
      });

      if (
        aiIndex.dest.type === 'index' &&
        (existing.seqNo === undefined || existing.primaryTerm === undefined)
      ) {
        throw new MemoryWriteError(
          'missing_concurrency_metadata',
          `Memory '${request.id}' is missing concurrency metadata.`
        );
      }

      await this.deps.esClient.index({
        index: aiIndex.dest.type === 'index' ? existing.backingIndex : aiIndex.dest.value,
        id: aiIndex.dest.type === 'index' ? existing.documentId : this.createDataStreamDocumentId(),
        document,
        ...(aiIndex.dest.type === 'data_stream'
          ? { op_type: 'create' as const }
          : {
              if_seq_no: existing.seqNo,
              if_primary_term: existing.primaryTerm,
            }),
        refresh: 'wait_for',
      });

      return { id: request.id, sessionId: request.sessionId };
    });
  }

  async forgetMemory(request: ForgetMemoryRequest): Promise<ForgetMemoryResult> {
    return this.withAudit(MemoryAuditAction.DELETE, request.aiIndexId, request.id, async () => {
      const aiIndex = await this.getWritableMemoryAiIndex(request.aiIndexId);
      const existing = await this.getExistingMemory(aiIndex, request.aiIndexId, request.id);

      if (existing.document.governance?.lifecycle?.status === 'deleted') {
        return { id: request.id };
      }

      const currentDate = this.getCurrentDate();
      const now = currentDate.toISOString();
      const document: StoredMemoryDocument = {
        ...existing.document,
        '@timestamp':
          aiIndex.dest.type === 'data_stream'
            ? this.getNextRevisionDate(existing.document, currentDate).toISOString()
            : existing.document['@timestamp'],
        updated_at: now,
        governance: {
          ...updateMemoryProvenance(existing.document.governance, request.writer, false),
          lifecycle: {
            ...existing.document.governance?.lifecycle,
            status: 'deleted',
          },
        },
      };

      if (
        aiIndex.dest.type === 'index' &&
        (existing.seqNo === undefined || existing.primaryTerm === undefined)
      ) {
        throw new MemoryWriteError(
          'missing_concurrency_metadata',
          `Memory '${request.id}' is missing concurrency metadata.`
        );
      }

      await this.deps.esClient.index({
        index: aiIndex.dest.type === 'index' ? existing.backingIndex : aiIndex.dest.value,
        id: aiIndex.dest.type === 'index' ? existing.documentId : this.createDataStreamDocumentId(),
        ...(aiIndex.dest.type === 'index' && {
          if_seq_no: existing.seqNo,
          if_primary_term: existing.primaryTerm,
        }),
        document,
        ...(aiIndex.dest.type === 'data_stream' && { op_type: 'create' as const }),
        refresh: 'wait_for',
      });

      return { id: request.id };
    });
  }

  private async withAudit<T extends { id: string }>(
    action: MemoryAuditAction,
    aiIndexId: string,
    memoryId: string | undefined,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await operation();
      this.deps.auditLogger.log(
        memoryAuditEvent({ action, aiIndexId, memoryId: memoryId ?? result.id })
      );
      return result;
    } catch (error) {
      this.deps.auditLogger.log(memoryAuditEvent({ action, aiIndexId, memoryId, error }));
      throw error;
    }
  }

  private async getWritableMemoryAiIndex(aiIndexId: string): Promise<AiIndexHttpItem> {
    const memoryEnabled = await this.deps.isMemoryEnabled();
    if (!memoryEnabled) {
      throw new MemoryWriteError('memory_disabled', 'Context Engine memory is not enabled.');
    }

    const aiIndex = await this.deps.aiIndexService.get(aiIndexId, this.deps.spaceId);
    if (!aiIndex.memory_enabled) {
      throw new MemoryWriteError(
        'ai_index_memory_disabled',
        `AI index '${aiIndexId}' does not have memory enabled.`
      );
    }
    if (isIndexPattern(aiIndex.dest.value)) {
      throw new MemoryWriteError(
        'destination_not_writable',
        `AI index '${aiIndexId}' uses an index pattern and cannot accept memory writes.`
      );
    }

    return aiIndex;
  }

  private async getExistingMemory(
    aiIndex: AiIndexHttpItem,
    aiIndexId: string,
    id: string
  ): Promise<ExistingMemory> {
    const response = await this.deps.esClient.search<StoredMemoryDocument>({
      index: aiIndex.dest.value,
      ignore_unavailable: true,
      allow_no_indices: true,
      allow_partial_search_results: false,
      ...(aiIndex.dest.type === 'data_stream'
        ? {
            query: {
              bool: {
                filter: [kiIdQuery(id), buildAiIndexSpaceFilter(this.deps.spaceId)],
              },
            },
            sort: [{ '@timestamp': { order: 'desc' as const, unmapped_type: 'date' as const } }],
            size: REVISION_TIE_WINDOW + 1,
          }
        : {
            query: {
              bool: {
                filter: [kiIdQuery(id), buildAiIndexSpaceFilter(this.deps.spaceId)],
              },
            },
            seq_no_primary_term: true,
            size: 2,
          }),
    });

    if (aiIndex.dest.type === 'index' && response.hits.hits.length > 1) {
      throw new MemoryWriteError(
        'duplicate_memory',
        `Memory '${id}' exists in multiple indices matched by AI index '${aiIndexId}'.`
      );
    }

    if (
      aiIndex.dest.type === 'data_stream' &&
      response.hits.hits.length > REVISION_TIE_WINDOW &&
      response.hits.hits[REVISION_TIE_WINDOW].sort?.[0] === response.hits.hits[0].sort?.[0]
    ) {
      throw new MemoryWriteError(
        'revision_tie_window_exceeded',
        `Memory '${id}' has too many revisions at the same timestamp to select safely.`
      );
    }

    const hit =
      aiIndex.dest.type === 'data_stream'
        ? pickCurrentRevision(response.hits.hits.slice(0, REVISION_TIE_WINDOW))
        : response.hits.hits[0];
    if (!hit?._id || !hit._source) {
      throw new MemoryWriteError(
        'memory_not_found',
        `Memory '${id}' was not found in AI index '${aiIndexId}'.`
      );
    }
    if (!isMemoryType(hit._source.type)) {
      throw new MemoryWriteError(
        'not_a_memory',
        `Document '${id}' in AI index '${aiIndexId}' is not a memory.`
      );
    }

    return {
      backingIndex: hit._index,
      documentId: hit._id,
      seqNo: hit._seq_no,
      primaryTerm: hit._primary_term,
      document: hit._source,
    };
  }

  private createDocument({
    request,
    aiIndex,
    id,
    existingDocument,
  }: {
    request: CreateMemoryRequest;
    aiIndex: AiIndexHttpItem;
    id: string;
    existingDocument?: StoredMemoryDocument;
  }): StoredMemoryDocument {
    const currentDate = this.getCurrentDate();
    const now = currentDate.toISOString();
    const defaultExpiresAt = new Date(
      currentDate.getTime() + DEFAULT_MEMORY_EXPIRATION_MS
    ).toISOString();
    const { expires_at: _existingExpiresAt, ...existingFields } = existingDocument ?? {};

    return {
      ...existingFields,
      '@timestamp':
        aiIndex.dest.type === 'data_stream' && existingDocument !== undefined
          ? this.getNextRevisionDate(existingDocument, currentDate).toISOString()
          : existingDocument?.['@timestamp'] ?? now,
      id,
      type: request.type,
      title: request.title,
      description: request.description,
      content: request.content,
      ...(request.tags !== undefined
        ? { tags: request.tags }
        : existingDocument?.tags !== undefined
        ? { tags: existingDocument.tags }
        : {}),
      ...(request.expiresAt === null
        ? {}
        : {
            expires_at:
              request.expiresAt !== undefined
                ? new Date(request.expiresAt).toISOString()
                : defaultExpiresAt,
          }),
      updated_at: now,
      references: request.references ?? existingDocument?.references,
      attributes: {
        ...existingDocument?.attributes,
        'memory.session_id': request.sessionId,
      },
      governance: updateMemoryProvenance(
        existingDocument?.governance,
        request.writer,
        existingDocument === undefined
      ),
    };
  }

  private getCurrentDate(): Date {
    return (this.deps.getCurrentDate ?? (() => new Date()))();
  }

  private getNextRevisionDate(existingDocument: StoredMemoryDocument, currentDate: Date): Date {
    const existingTimestamp = Date.parse(existingDocument['@timestamp']);
    if (Number.isNaN(existingTimestamp)) {
      throw new MemoryWriteError(
        'invalid_memory_timestamp',
        `Memory '${existingDocument.id}' has an invalid timestamp.`
      );
    }
    // Current-revision reads sort by @timestamp, so revisions must remain monotonic even if the
    // parent was written by a clock ahead of this Kibana instance.
    return new Date(Math.max(currentDate.getTime(), existingTimestamp + 1));
  }

  private createDataStreamDocumentId(): string {
    return `memory-revision-${(this.deps.generateRevisionId ?? randomUUID)()}`;
  }
}
