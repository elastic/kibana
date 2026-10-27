/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  ForgetMemoryResponse,
  RememberMemoryRequest,
  RememberMemoryResponse,
} from '../../common/http_api/memory';
import {
  MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS,
  MAX_SHORT_TERM_MEMORY_EXPIRATION_MS,
  MEMORY_ATTRIBUTES,
  SHORT_TERM_MEMORY_DATA_STREAM,
  SHORT_TERM_MEMORY_TYPES,
} from '../../common/memory';
import type { ShortTermMemoryType } from '../../common/memory';
import {
  MemoryDisabledError,
  MemoryForbiddenError,
  MemoryNotFoundError,
  MemoryValidationError,
} from './errors';
import {
  buildMemorySpaceFilter,
  createSpacePermissions,
  createUserWriter,
  isDeletedMemory,
  updateMemoryProvenance,
  withUserId,
} from './memory_document';
import type {
  MemoryReference,
  MemoryUser,
  MemoryWriter,
  StoredMemoryDocument,
} from './memory_document';

export interface RememberParams extends RememberMemoryRequest {
  /** Defaults to the calling user. A supplied writer gets the user's id added to its metadata. */
  writer?: MemoryWriter;
  /** Replaces the memory's references. Omit to keep the existing ones when revising. */
  references?: MemoryReference[];
}

export interface ForgetParams {
  id: string;
  writer?: MemoryWriter;
}

/** Writes short-term memories for one request, in that request's space. */
export interface MemoryServiceApi {
  remember(params: RememberParams): Promise<RememberMemoryResponse>;
  forget(params: ForgetParams): Promise<ForgetMemoryResponse>;
}

export interface MemoryServiceDeps {
  spaceId: string;
  /** Writes go through the internal user, after the checks below. */
  esClient: ElasticsearchClient;
  logger: Logger;
  isContextEngineEnabled: () => Promise<boolean>;
  isMemoryEnabled: () => Promise<boolean>;
  hasWritePrivilege: () => Promise<boolean>;
  getCurrentUser: () => Promise<MemoryUser>;
  /** Registers the short-term store in the space, so its memories show up in Context Engine. */
  ensureStore: () => Promise<void>;
  generateId?: () => string;
  getCurrentDate?: () => Date;
}

const SHORT_TERM_TYPE_SET: ReadonlySet<string> = new Set(SHORT_TERM_MEMORY_TYPES);

const isShortTermType = (type: string): type is ShortTermMemoryType =>
  SHORT_TERM_TYPE_SET.has(type);

export class MemoryService implements MemoryServiceApi {
  private readonly generateId: () => string;
  private readonly getCurrentDate: () => Date;

  constructor(private readonly deps: MemoryServiceDeps) {
    this.generateId = deps.generateId ?? randomUUID;
    this.getCurrentDate = deps.getCurrentDate ?? (() => new Date());
  }

  async remember(params: RememberParams): Promise<RememberMemoryResponse> {
    const user = await this.assertCanWrite();
    const currentDate = this.getCurrentDate();
    const now = currentDate.toISOString();
    const expiresAt = this.resolveExpiresAt(params.expires_at, currentDate);

    const existing = params.id ? await this.getLatestRevision(params.id) : undefined;
    if (params.id && !existing) {
      throw new MemoryNotFoundError(params.id);
    }
    if (existing) {
      this.assertRevisable(existing, params.type);
    }

    const id = params.id ?? this.generateId();
    const sessionId =
      params.session_id ??
      (existing?.attributes?.[MEMORY_ATTRIBUTES.sessionId] as string | undefined) ??
      this.generateId();
    const writer = this.resolveWriter(params.writer, user);
    const tags = params.tags ?? existing?.tags;
    const references = params.references ?? existing?.references;

    const document: StoredMemoryDocument = {
      '@timestamp': now,
      id,
      type: params.type,
      title: params.title,
      description: params.description,
      content: params.content,
      ...(tags !== undefined && { tags }),
      expires_at: expiresAt,
      updated_at: now,
      ...(references !== undefined && { references }),
      attributes: {
        ...existing?.attributes,
        [MEMORY_ATTRIBUTES.sessionId]: sessionId,
      },
      governance: updateMemoryProvenance(existing?.governance, writer, existing === undefined),
      permissions: createSpacePermissions(this.deps.spaceId),
    };

    await this.write(document);
    return { id, session_id: sessionId };
  }

  async forget({ id, writer }: ForgetParams): Promise<ForgetMemoryResponse> {
    const user = await this.assertCanWrite();
    const existing = await this.getLatestRevision(id);
    if (!existing || !isShortTermType(existing.type)) {
      throw new MemoryNotFoundError(id);
    }
    if (isDeletedMemory(existing)) {
      return { id };
    }

    const now = this.getCurrentDate().toISOString();
    await this.write({
      ...existing,
      '@timestamp': now,
      updated_at: now,
      governance: {
        ...updateMemoryProvenance(existing.governance, this.resolveWriter(writer, user), false),
        lifecycle: { ...existing.governance?.lifecycle, status: 'deleted' },
      },
      permissions: createSpacePermissions(this.deps.spaceId),
    });
    return { id };
  }

  private async assertCanWrite(): Promise<MemoryUser> {
    const { isContextEngineEnabled, isMemoryEnabled, hasWritePrivilege, getCurrentUser } =
      this.deps;
    if (!(await isContextEngineEnabled())) {
      throw new MemoryDisabledError('Context Engine is disabled in this space.');
    }
    if (!(await isMemoryEnabled())) {
      throw new MemoryDisabledError();
    }
    if (!(await hasWritePrivilege())) {
      throw new MemoryForbiddenError();
    }
    return getCurrentUser();
  }

  private resolveExpiresAt(expiresAt: string | undefined, currentDate: Date): string {
    const max = currentDate.getTime() + MAX_SHORT_TERM_MEMORY_EXPIRATION_MS;
    if (expiresAt === undefined) {
      return new Date(max).toISOString();
    }
    const time = new Date(expiresAt).getTime();
    if (Number.isNaN(time)) {
      throw new MemoryValidationError('expires_at must be an ISO 8601 date.');
    }
    if (time <= currentDate.getTime()) {
      throw new MemoryValidationError('expires_at must be in the future.');
    }
    if (time > max) {
      throw new MemoryValidationError(
        `expires_at must be at most ${MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS} days from now.`
      );
    }
    return new Date(time).toISOString();
  }

  private assertRevisable(existing: StoredMemoryDocument, type: ShortTermMemoryType): void {
    if (!isShortTermType(existing.type)) {
      throw new MemoryNotFoundError(existing.id);
    }
    if (existing.type !== type) {
      throw new MemoryValidationError(
        `Memory '${existing.id}' has type '${existing.type}' and cannot be revised as '${type}'.`
      );
    }
    if (isDeletedMemory(existing)) {
      throw new MemoryValidationError(`Memory '${existing.id}' was deleted and cannot be revised.`);
    }
  }

  private resolveWriter(writer: MemoryWriter | undefined, user: MemoryUser): MemoryWriter {
    return writer ? withUserId(writer, user) : createUserWriter(user, this.deps.spaceId);
  }

  private async getLatestRevision(id: string): Promise<StoredMemoryDocument | undefined> {
    const response = await this.deps.esClient.search<StoredMemoryDocument>({
      index: SHORT_TERM_MEMORY_DATA_STREAM,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 1,
      sort: [{ '@timestamp': 'desc' as const }],
      query: {
        bool: { filter: [{ term: { id } }, buildMemorySpaceFilter(this.deps.spaceId)] },
      },
    });
    return response.hits.hits[0]?._source;
  }

  private async write(document: StoredMemoryDocument): Promise<void> {
    await this.deps.ensureStore();
    await this.deps.esClient.index({
      index: SHORT_TERM_MEMORY_DATA_STREAM,
      op_type: 'create',
      document,
      refresh: 'wait_for',
    });
  }
}
