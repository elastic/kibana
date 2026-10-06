/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type {
  InternalIStorageClient,
  StorageClientSearchRequest,
  StorageTransportOptions,
} from '@kbn/storage-adapter';
import type {
  InvestigationAttachmentDocument,
  StoredInvestigationAttachment,
} from '../../common/investigation_attachments';
import {
  InvestigationAttachmentConflictError,
  InvestigationAttachmentInvalidRequestError,
  isVersionConflict,
} from './errors';
import { sameInvestigationAttachmentDocument } from './same_document';
import { withTransientSearchRetry } from './search_with_transient_retry';

/** Two writers converge on the retry; the third attempt is spare. */
export const MAX_INVESTIGATION_ATTACHMENT_WRITE_ATTEMPTS = 3;

/** Ceiling on conversation ids per bulk read or candidate search. */
export const MAX_INVESTIGATION_ATTACHMENT_CONVERSATION_IDS = 1000;

/** Bound on ids forwarded to Elasticsearch. Matches the HTTP schemas of every entity. */
export const MAX_INVESTIGATION_ATTACHMENT_ID_LENGTH = 256;

/**
 * The storage-adapter operations the service uses, as provided by the entity index's
 * `IStorageClient`. `search` is narrowed to plain hits so generic code can read `_source`.
 */
export type InvestigationAttachmentStorage<TStored extends StoredInvestigationAttachment> = Pick<
  InternalIStorageClient<TStored>,
  'index' | 'delete' | 'bulk'
> & {
  search: (
    request: StorageClientSearchRequest,
    transportOptions?: StorageTransportOptions
  ) => Promise<{ hits: { hits: Array<SearchHit<TStored>> } }>;
};

interface VersionedDocument<TStored extends StoredInvestigationAttachment> {
  document: InvestigationAttachmentDocument<TStored>;
  seqNo: number;
  primaryTerm: number;
}

/** Document indexed by `upsert`, plus the body that write overwrote. */
export interface WrittenInvestigationAttachment<TStored extends StoredInvestigationAttachment> {
  written: InvestigationAttachmentDocument<TStored>;
  /** Absent when this write created the document. */
  previous?: InvestigationAttachmentDocument<TStored>;
}

export interface InvestigationAttachmentDocServiceOptions<
  TStored extends StoredInvestigationAttachment
> {
  /** Agent Builder attachment type, used in error messages. */
  type: string;
  storage: InvestigationAttachmentStorage<TStored>;
  /** Upper bound on documents one conversation holds. 1 for one-document-per-conversation types. */
  maxDocumentsPerConversation?: number;
}

/**
 * Generic store behind a by-reference investigation attachment: one hidden index, documents
 * keyed by space and conversation, optimistic-concurrency writes. Reads and writes go through
 * the internal user, so callers authorize first and pass the space from the request.
 */
export class InvestigationAttachmentDocService<TStored extends StoredInvestigationAttachment> {
  private readonly maxDocumentsPerConversation: number;
  /** Every read of the index: a missing index has no hits, unallocated shards are retried. */
  private readonly search: InvestigationAttachmentStorage<TStored>['search'];

  constructor(private readonly options: InvestigationAttachmentDocServiceOptions<TStored>) {
    this.maxDocumentsPerConversation = options.maxDocumentsPerConversation ?? 1;
    this.search = withTransientSearchRetry<TStored>((...args) => options.storage.search(...args));
  }

  /** The document by id, or undefined when it is missing or belongs to another space. */
  async get(
    id: string,
    spaceId: string
  ): Promise<InvestigationAttachmentDocument<TStored> | undefined> {
    assertBoundedId(spaceId, 'spaceId');
    if (id.length < 1 || id.length > MAX_INVESTIGATION_ATTACHMENT_ID_LENGTH) {
      return undefined;
    }
    const existing = await this.findVersioned(id);
    if (!existing || existing.document.spaceId !== spaceId) {
      return undefined;
    }
    return existing.document;
  }

  /**
   * Read-modify-write under optimistic concurrency. `mutate` receives the current document
   * (undefined when none exists) and returns the body to store; it runs again with the fresh
   * document when a concurrent writer wins the version check. Throws
   * {@link InvestigationAttachmentConflictError} after the last attempt.
   */
  async upsert({
    id,
    mutate,
  }: {
    id: string;
    mutate: (current: InvestigationAttachmentDocument<TStored> | undefined) => TStored;
  }): Promise<WrittenInvestigationAttachment<TStored>> {
    for (let attempt = 0; attempt < MAX_INVESTIGATION_ATTACHMENT_WRITE_ATTEMPTS; attempt++) {
      const written = await this.tryWrite(id, mutate);
      if (written) {
        return written;
      }
    }
    throw new InvestigationAttachmentConflictError(this.options.type, id);
  }

  /**
   * Undoes an `upsert` whose conversation attachment did not land. Deletes a document that call
   * created, or restores `previous`, only while the stored body is still the one it wrote.
   */
  async revert({ written, previous }: WrittenInvestigationAttachment<TStored>): Promise<void> {
    const current = await this.findVersioned(written.id);
    if (!current || !sameInvestigationAttachmentDocument(current.document, written)) {
      return;
    }

    try {
      if (!previous) {
        await this.options.storage.delete({
          id: written.id,
          if_seq_no: current.seqNo,
          if_primary_term: current.primaryTerm,
        });
        return;
      }
      await this.options.storage.index({
        id: written.id,
        document: toStored(previous),
        if_seq_no: current.seqNo,
        if_primary_term: current.primaryTerm,
      });
    } catch (error) {
      if (!isVersionConflict(error)) {
        throw error;
      }
    }
  }

  /** Every document of the given conversations in the space. Missing conversations are omitted. */
  async listByConversationIds(
    conversationIds: string[],
    spaceId: string
  ): Promise<Array<InvestigationAttachmentDocument<TStored>>> {
    const ids = assertConversationIds(conversationIds);
    if (ids.length === 0) {
      return [];
    }
    assertBoundedId(spaceId, 'spaceId');

    const response = await this.search({
      track_total_hits: false,
      size: Math.min(ids.length * this.maxDocumentsPerConversation, MAX_RESULT_WINDOW),
      query: {
        bool: {
          filter: [{ term: { spaceId } }, { terms: { conversationId: ids } }],
        },
      },
    });

    return response.hits.hits.flatMap((hit) =>
      hit._id !== undefined && hit._source ? [toDocument(hit._id, hit._source)] : []
    );
  }

  /**
   * Conversation ids whose documents match every filter clause, for list filters that start from
   * this index. Unique, in hit order, at most `size`.
   */
  async searchConversationIds({
    spaceId,
    filter,
    size = MAX_INVESTIGATION_ATTACHMENT_CONVERSATION_IDS,
  }: {
    spaceId: string;
    filter: QueryDslQueryContainer[];
    size?: number;
  }): Promise<string[]> {
    assertBoundedId(spaceId, 'spaceId');
    if (size < 1 || size > MAX_INVESTIGATION_ATTACHMENT_CONVERSATION_IDS) {
      throw new InvestigationAttachmentInvalidRequestError(
        `size must be between 1 and ${MAX_INVESTIGATION_ATTACHMENT_CONVERSATION_IDS}`
      );
    }

    const response = await this.search({
      track_total_hits: false,
      size: Math.min(size * this.maxDocumentsPerConversation, MAX_RESULT_WINDOW),
      _source: ['conversationId'],
      query: { bool: { filter: [{ term: { spaceId } }, ...filter] } },
    });

    const conversationIds = new Set<string>();
    for (const hit of response.hits.hits) {
      const conversationId = hit._source?.conversationId;
      if (conversationId !== undefined) {
        conversationIds.add(conversationId);
      }
      if (conversationIds.size >= size) {
        break;
      }
    }
    return [...conversationIds];
  }

  /** Maintenance: removes every document of the given conversations in the space. */
  async deleteByConversationIds(conversationIds: string[], spaceId: string): Promise<number> {
    const ids = assertConversationIds(conversationIds);
    if (ids.length === 0) {
      return 0;
    }
    assertBoundedId(spaceId, 'spaceId');
    return this.deleteMatching([{ term: { spaceId } }, { terms: { conversationId: ids } }]);
  }

  /** Maintenance: removes every document in the space. */
  async deleteAllInSpace(spaceId: string): Promise<number> {
    assertBoundedId(spaceId, 'spaceId');
    return this.deleteMatching([{ term: { spaceId } }]);
  }

  private async deleteMatching(filter: QueryDslQueryContainer[]): Promise<number> {
    let deleted = 0;
    // Each page is deleted before the next search, so the loop drains the matches. The cap
    // bounds the work if documents are written faster than they are removed.
    for (let page = 0; page < MAX_DELETE_PAGES; page++) {
      const response = await this.search({
        track_total_hits: false,
        size: MAX_INVESTIGATION_ATTACHMENT_CONVERSATION_IDS,
        _source: false,
        query: { bool: { filter } },
      });
      const ids = response.hits.hits.flatMap((hit) => (hit._id !== undefined ? [hit._id] : []));
      if (ids.length === 0) {
        return deleted;
      }
      await this.options.storage.bulk({
        operations: ids.map((id) => ({ delete: { _id: id } })),
        throwOnFail: true,
      });
      deleted += ids.length;
    }
    return deleted;
  }

  /**
   * Returns the indexed document and the body it overwrote, or undefined when a concurrent
   * writer won the version check and the caller should re-read and mutate again.
   */
  private async tryWrite(
    id: string,
    mutate: (current: InvestigationAttachmentDocument<TStored> | undefined) => TStored
  ): Promise<WrittenInvestigationAttachment<TStored> | undefined> {
    const existing = await this.findVersioned(id);
    const document = mutate(existing?.document);
    try {
      if (!existing) {
        await this.options.storage.index({ id, document, op_type: 'create' });
        return { written: toDocument(id, document) };
      }
      await this.options.storage.index({
        id,
        document,
        if_seq_no: existing.seqNo,
        if_primary_term: existing.primaryTerm,
      });
      return { written: toDocument(id, document), previous: existing.document };
    } catch (error) {
      if (isVersionConflict(error)) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Versioned read for optimistic concurrency. Storage `get` is a search that does not request
   * `_seq_no` / `_primary_term`, and a search hit omits them unless asked. This read asks.
   */
  private async findVersioned(id: string): Promise<VersionedDocument<TStored> | undefined> {
    const response = await this.search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      seq_no_primary_term: true,
      query: { bool: { filter: [{ term: { _id: id } }] } },
    });
    const hit = response.hits.hits[0];
    if (!hit) {
      return undefined;
    }
    if (
      hit._id === undefined ||
      !hit._source ||
      hit._seq_no === undefined ||
      hit._primary_term === undefined
    ) {
      throw new Error(
        `Investigation attachment ${this.options.type} [${id}] is missing concurrency metadata`
      );
    }
    return {
      document: toDocument(hit._id, hit._source),
      seqNo: hit._seq_no,
      primaryTerm: hit._primary_term,
    };
  }
}

/** Elasticsearch's default `index.max_result_window`. */
const MAX_RESULT_WINDOW = 10_000;

/** Bounds the maintenance delete loop at 100 000 documents per call. */
const MAX_DELETE_PAGES = 100;

const toDocument = <TStored extends StoredInvestigationAttachment>(
  id: string,
  stored: TStored
): InvestigationAttachmentDocument<TStored> => ({ ...stored, id });

/** The stored body of a document: everything but its `_id`. */
function toStored<TStored extends StoredInvestigationAttachment>(
  document: InvestigationAttachmentDocument<TStored>
): TStored;
function toStored({
  id: _id,
  ...stored
}: InvestigationAttachmentDocument<StoredInvestigationAttachment>): StoredInvestigationAttachment {
  return stored;
}

export const assertBoundedId = (value: string, field: string): void => {
  if (value.length < 1 || value.length > MAX_INVESTIGATION_ATTACHMENT_ID_LENGTH) {
    throw new InvestigationAttachmentInvalidRequestError(
      `${field} must be between 1 and ${MAX_INVESTIGATION_ATTACHMENT_ID_LENGTH} characters`
    );
  }
};

const assertConversationIds = (conversationIds: string[]): string[] => {
  const ids = [...new Set(conversationIds)];
  if (ids.length > MAX_INVESTIGATION_ATTACHMENT_CONVERSATION_IDS) {
    throw new InvestigationAttachmentInvalidRequestError(
      `conversationIds may not exceed ${MAX_INVESTIGATION_ATTACHMENT_CONVERSATION_IDS}`
    );
  }
  for (const id of ids) {
    assertBoundedId(id, 'conversationId');
  }
  return ids;
};
