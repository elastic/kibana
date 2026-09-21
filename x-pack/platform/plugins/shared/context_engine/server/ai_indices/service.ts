/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { isResponseError } from '@kbn/es-errors';
import pRetry from 'p-retry';
import {
  AI_INDEX_DATA_STREAM_PREFIX as DATA_STREAM_PREFIX,
  AI_INDEX_INDEX_PREFIX as INDEX_PREFIX,
  MAX_AI_INDEX_AUTOMATIONS,
  MAX_AI_INDICES,
} from '../../common/constants';
import type {
  AiIndexDest,
  AiIndexFeedbackAnalysis,
  AiIndexHttpItem,
  AiIndexProperties,
} from '../../common/http_api/ai_indices';
import { createSpaceDslFilter } from '../utils/space_filter';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexManagedError,
  AiIndexNotFoundError,
  AiIndexIdConflictError,
  AiIndexAlreadyExistsError,
} from './errors';
import type { AiIndexDocument, AiIndexStorageClient, StoredAiIndexDocument } from './storage';
import { buildManagedAiIndexDocId, createAiIndexStorageClient } from './storage';
import { putKiView } from './ki_view';
import { buildTraceQueries } from './trace_queries';
import { createAiIndexIdentityDslFilter } from '../utils/ai_index_identity_filter';
import { AI_INDEX_DEST_VALUE_PATTERN } from '../../common/validation';

/** Resolves the identity a pre-upgrade document carries implicitly, in its `_id` and its absence of a space. */
const toAiIndexDocument = (source: StoredAiIndexDocument, docId: string): AiIndexDocument => ({
  ...source,
  id: source.id ?? docId,
  space: source.space ?? DEFAULT_SPACE_ID,
});

const toAiIndexItem = (document: AiIndexDocument): AiIndexHttpItem => ({
  id: document.id,
  ...(document.description !== undefined && { description: document.description }),
  ...(document.feedback_analysis !== undefined && {
    feedback_analysis: document.feedback_analysis,
  }),
  managed: document.managed ?? false,
  dest: document.dest,
  automations: document.automations,
  sources: document.sources,
  traces: buildTraceQueries(document.traces ?? [], document.space),
  date_created: document.date_created,
  date_modified: document.date_modified,
});

const ADD_AUTOMATION_CONFLICT_RETRIES = 2;

export interface AiIndexManagedBootstrap {
  isManaged: (id: string) => boolean;
  getManagedIds: () => string[];
  ensure: (id: string, spaceId: string) => Promise<boolean>;
}

type AiIndexAutomationTarget = Pick<AiIndexDocument, 'managed' | 'automations'>;

const assertAiIndexAcceptsAutomation = (
  aiIndexId: string,
  index: AiIndexAutomationTarget,
  automation?: { type: 'workflow'; value: string }
): { alreadyAttached: boolean } => {
  if (index.managed) {
    throw new AiIndexManagedError(aiIndexId);
  }

  const alreadyAttached =
    automation !== undefined &&
    index.automations.some(
      (entry) => entry.type === automation.type && entry.value === automation.value
    );

  if (!alreadyAttached && index.automations.length >= MAX_AI_INDEX_AUTOMATIONS) {
    throw new Error(
      `AI index "${aiIndexId}" already has the maximum number of automations (${MAX_AI_INDEX_AUTOMATIONS}).`
    );
  }

  return { alreadyAttached };
};

/**
 * Manages the AI index registry stored in the hidden
 * `.contextengine-ai-indices` system index. Reads and writes go through the
 * internal user; access is enforced at the API layer.
 */
export class AiIndexService {
  private readonly esClient: ElasticsearchClient;
  private readonly storageClient: AiIndexStorageClient;
  private readonly managedBootstrap?: AiIndexManagedBootstrap;
  private readonly logger: Logger;

  constructor({
    esClient,
    logger,
    managedBootstrap,
  }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    managedBootstrap?: AiIndexManagedBootstrap;
  }) {
    this.esClient = esClient;
    this.storageClient = createAiIndexStorageClient({ esClient, logger });
    this.managedBootstrap = managedBootstrap;
    this.logger = logger;
  }

  /** Creates a new AI index. Duplicate ids throw {@link AiIndexAlreadyExistsError}. */
  async create(aiIndexId: string, spaceId: string, properties: AiIndexProperties): Promise<void> {
    if (this.managedBootstrap?.isManaged(aiIndexId)) {
      throw new AiIndexManagedError(aiIndexId);
    }
    await this.assertValidDest(properties.dest);

    const existing = await this.findDocument(aiIndexId, spaceId);
    if (existing) {
      throw new AiIndexAlreadyExistsError(aiIndexId);
    }
    await this.putView(aiIndexId, properties.dest);

    // Uniqueness is a read-then-write check rather than `op_type: 'create'`, matching the Agent Builder persisted clients.
    await this.writeDocument(
      aiIndexId,
      spaceId,
      { ...properties, id: aiIndexId, space: spaceId, managed: false },
      undefined
    );
  }

  /**
   * Creates or fully replaces an AI index, preserving `date_created` on update.
   * Concurrent writes are guarded with optimistic concurrency control; a losing
   * writer gets an {@link AiIndexConflictError}. Managed entries (registered
   * by a plugin at startup) are immutable via this method.
   */
  async put(
    aiIndexId: string,
    spaceId: string,
    properties: AiIndexProperties
  ): Promise<'created' | 'updated'> {
    await this.assertValidDest(properties.dest);

    const existing = await this.findDocument(aiIndexId, spaceId);
    if (existing?.document.managed || (!existing && this.managedBootstrap?.isManaged(aiIndexId))) {
      throw new AiIndexManagedError(aiIndexId);
    }

    await this.putView(aiIndexId, properties.dest);
    return this.writeDocument(
      aiIndexId,
      spaceId,
      { ...properties, id: aiIndexId, space: spaceId, managed: false },
      existing
    );
  }

  /**
   * Creates or fully replaces a managed AI index. Managed entries are owned by
   * the registering plugin and cannot be mutated via the public API.
   *
   * This is an idempotent upsert: it is safe to call on every access, so a
   * managed entry always reflects the latest registration (the source of truth
   * lives in code). It will overwrite an existing managed entry, but refuses to
   * clobber a user-owned (unmanaged) entry that squats the same id, throwing
   * {@link AiIndexIdConflictError} so the collision surfaces instead of
   * silently destroying user data.
   */
  async putManaged(
    aiIndexId: string,
    spaceId: string,
    properties: AiIndexProperties
  ): Promise<'created' | 'updated'> {
    await this.assertValidDest(properties.dest, { managed: true });
    const existing = await this.findDocument(aiIndexId, spaceId);
    if (existing && !existing.document.managed) {
      throw new AiIndexIdConflictError(aiIndexId);
    }
    await this.putView(aiIndexId, properties.dest);
    return this.writeDocument(
      aiIndexId,
      spaceId,
      { ...properties, id: aiIndexId, space: spaceId, managed: true },
      existing,
      { docId: buildManagedAiIndexDocId(spaceId, aiIndexId) }
    );
  }

  private async writeDocument(
    aiIndexId: string,
    spaceId: string,
    document: Omit<AiIndexDocument, 'date_created' | 'date_modified'>,
    existing: Awaited<ReturnType<typeof this.findDocument>>,
    options?: { docId?: string }
  ): Promise<'created' | 'updated'> {
    const now = new Date().toISOString();
    const fullDocument: AiIndexDocument = {
      ...document,
      date_created: existing?.document.date_created ?? now,
      date_modified: now,
    };

    try {
      if (existing) {
        // Writing back to the existing `_id` upgrades a pre-upgrade document in place (it gains `id` and `space`) instead of duplicating it.
        await this.storageClient.index({
          id: existing.docId,
          document: fullDocument,
          if_seq_no: existing.seqNo,
          if_primary_term: existing.primaryTerm,
          refresh: 'wait_for',
        });
        return 'updated';
      }

      if (options?.docId) {
        await this.storageClient.index({
          id: options.docId,
          document: fullDocument,
          op_type: 'create',
          refresh: 'wait_for',
        });
      } else {
        await this.storageClient.index({
          document: fullDocument,
          refresh: 'wait_for',
        });
      }
      return 'created';
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 409) {
        throw new AiIndexConflictError(aiIndexId);
      }
      throw error;
    }
  }

  /**
   * Replaces only the feedback analysis block, leaving the rest of the entry —
   * including its `managed` flag and its dest — untouched.
   *
   * Unlike {@link put} this is permitted on managed entries. A managed entry's
   * *definition* is owned by the plugin that registers it, but which agent
   * analyzes it and how often is operator preference; without this carve-out
   * the indices that ship by default would be the only ones that could never
   * be analyzed.
   */
  async setFeedbackAnalysis(
    aiIndexId: string,
    spaceId: string,
    feedbackAnalysis: AiIndexFeedbackAnalysis
  ): Promise<AiIndexFeedbackAnalysis> {
    const existing = await this.findDocument(aiIndexId, spaceId);
    if (!existing) {
      throw new AiIndexNotFoundError(aiIndexId);
    }

    // The dest is unchanged, so it is not re-validated here: an index whose
    // backing store was deleted after registration must still be switchable
    // off.
    await this.writeDocument(
      aiIndexId,
      spaceId,
      { ...existing.document, feedback_analysis: feedbackAnalysis },
      existing
    );

    return feedbackAnalysis;
  }

  async get(aiIndexId: string, spaceId: string): Promise<AiIndexHttpItem> {
    const existing = await this.findDocument(aiIndexId, spaceId);
    if (existing) {
      return toAiIndexItem(existing.document);
    }
    if (!this.managedBootstrap?.isManaged(aiIndexId)) {
      throw new AiIndexNotFoundError(aiIndexId);
    }
    await this.managedBootstrap.ensure(aiIndexId, spaceId);
    const newManagedAiIndex = await this.findDocument(aiIndexId, spaceId);
    if (!newManagedAiIndex) {
      throw new AiIndexNotFoundError(aiIndexId);
    }
    return toAiIndexItem(newManagedAiIndex.document);
  }

  /**
   * Fail-fast validation before expensive side effects.
   */
  async assertCanAcceptAutomation(
    aiIndexId: string,
    spaceId: string,
    automation?: { type: 'workflow'; value: string }
  ): Promise<void> {
    const existing = await this.findDocument(aiIndexId, spaceId);
    if (!existing) {
      throw new AiIndexNotFoundError(aiIndexId);
    }

    assertAiIndexAcceptsAutomation(aiIndexId, existing.document, automation);
  }

  /**
   * Appends a workflow automation to an AI index, retrying on concurrent writes.
   */
  async addAutomation(
    aiIndexId: string,
    spaceId: string,
    automation: { type: 'workflow'; value: string }
  ): Promise<'attached' | 'already_attached'> {
    return pRetry(
      async () => {
        const existing = await this.findDocument(aiIndexId, spaceId);
        if (!existing) {
          throw new AiIndexNotFoundError(aiIndexId);
        }

        const { alreadyAttached } = assertAiIndexAcceptsAutomation(
          aiIndexId,
          existing.document,
          automation
        );
        if (alreadyAttached) {
          return 'already_attached';
        }

        await this.writeDocument(
          aiIndexId,
          spaceId,
          {
            ...existing.document,
            automations: [...existing.document.automations, automation],
          },
          existing
        );

        return 'attached';
      },
      {
        retries: ADD_AUTOMATION_CONFLICT_RETRIES,
        onFailedAttempt: (error) => {
          if (!(error instanceof AiIndexConflictError)) {
            throw error;
          }
        },
      }
    );
  }

  async list(spaceId: string): Promise<AiIndexHttpItem[]> {
    const items = await this.searchSpace(spaceId);
    const missingManagedIds =
      this.managedBootstrap
        ?.getManagedIds()
        .filter((id) => !items.some((item) => item.id === id)) ?? [];
    if (missingManagedIds.length === 0) {
      return items;
    }

    // Bootstrap failures (e.g. an invalid managed dest) are isolated per id so
    // that one broken managed entry doesn't hide the rest of the space's list.
    await Promise.all(
      missingManagedIds.map(async (id) => {
        try {
          await this.managedBootstrap?.ensure(id, spaceId);
        } catch (error) {
          this.logger.warn(
            `Failed to bootstrap managed AI index '${id}' in space '${spaceId}': ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      })
    );
    return this.searchSpace(spaceId);
  }

  /**
   * Deletes the AI index entry only; backing indices are left untouched.
   * Managed entries cannot be deleted via the API.
   */
  async delete(aiIndexId: string, spaceId: string): Promise<void> {
    const existing = await this.findDocument(aiIndexId, spaceId);
    if (!existing) {
      throw new AiIndexNotFoundError(aiIndexId);
    }
    if (existing.document.managed) {
      throw new AiIndexManagedError(aiIndexId);
    }
    // Re-check the delete result: the entry may have been removed concurrently
    // between the existence lookup above and this call.
    const { result } = await this.storageClient.delete({
      id: existing.docId,
    });
    if (result === 'not_found') {
      throw new AiIndexNotFoundError(aiIndexId);
    }
  }

  private putView(aiIndexId: string, dest: AiIndexDest): Promise<void> {
    return putKiView({ esClient: this.esClient, aiIndexId, dest });
  }

  private async searchSpace(spaceId: string): Promise<AiIndexHttpItem[]> {
    const response = await this.storageClient.search({
      size: MAX_AI_INDICES,
      track_total_hits: false,
      query: createSpaceDslFilter(spaceId),
      // Pre-upgrade documents have no `id` to sort on and land at the end, where `_doc` keeps
      // their order stable rather than leaving it undefined under the `size` cap.
      sort: [{ id: { order: 'asc', missing: '_last' } }, { _doc: { order: 'asc' } }],
    });
    return response.hits.hits.flatMap((hit) => {
      if (!hit._source || hit._id === undefined) {
        return [];
      }
      return [toAiIndexItem(toAiIndexDocument(hit._source, hit._id))];
    });
  }

  private async findDocument(
    aiIndexId: string,
    spaceId: string
  ): Promise<
    | {
        docId: string;
        document: AiIndexDocument;
        seqNo?: number;
        primaryTerm?: number;
      }
    | undefined
  > {
    const response = await this.storageClient.search({
      size: 1,
      track_total_hits: false,
      seq_no_primary_term: true,
      query: createAiIndexIdentityDslFilter(aiIndexId, spaceId),
    });

    const [hit] = response.hits.hits;
    if (!hit?._source || hit._id === undefined) {
      return undefined;
    }
    return {
      docId: hit._id,
      document: toAiIndexDocument(hit._source, hit._id),
      seqNo: hit._seq_no,
      primaryTerm: hit._primary_term,
    };
  }

  /**
   * The dest value must follow the type-specific naming convention and match
   * the declared `type`. A managed entry may also use the dot-prefixed form,
   * which is reserved for Kibana-internal backing stores.
   */
  private async assertValidDest(
    { type, value }: AiIndexDest,
    { managed = false }: { managed?: boolean } = {}
  ): Promise<void> {
    if (type === 'data_stream') {
      await this.assertValidDataStreamDest(value, managed);
    } else {
      await this.assertValidIndexDest(value, managed);
    }
  }

  private allowedDestPrefixes(basePrefix: string, managed: boolean): string[] {
    return managed ? [basePrefix, `.${basePrefix}`] : [basePrefix];
  }

  /**
   * Every expression in the dest value must start with one of the type-specific
   * prefixes.
   */
  private assertDestValueHasPrefix(value: string, prefixes: string[]): void {
    if (!AI_INDEX_DEST_VALUE_PATTERN.test(value)) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: only lowercase letters, numbers, and '_.*,+-' are permitted`
      );
    }
    const invalid = value
      .split(',')
      .find((expression) => !prefixes.some((prefix) => expression.startsWith(prefix)));
    if (invalid !== undefined) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: every expression must start with '${prefixes[0]}'`
      );
    }
  }

  private async assertValidDataStreamDest(value: string, managed: boolean): Promise<void> {
    const prefixes = this.allowedDestPrefixes(DATA_STREAM_PREFIX, managed);
    this.assertDestValueHasPrefix(value, prefixes);

    let indices: estypes.IndicesResolveIndexResolveIndexItem[] = [];
    let dataStreams: estypes.IndicesResolveIndexResolveIndexDataStreamsItem[] = [];
    try {
      const resolved = await this.esClient.indices.resolveIndex({
        name: value,
        expand_wildcards: ['open', 'hidden', 'closed'],
      });
      indices = resolved.indices;
      dataStreams = resolved.data_streams;
    } catch (error) {
      if (!(isResponseError(error) && error.statusCode === 404)) {
        throw error;
      }
    }

    if (indices.length > 0) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: '${indices[0].name}' is not a data stream`
      );
    }

    const invalidPrefix = dataStreams.find(
      (ds) => !prefixes.some((prefix) => ds.name.startsWith(prefix))
    );
    if (invalidPrefix) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: '${invalidPrefix.name}' must start with '${DATA_STREAM_PREFIX}'`
      );
    }
  }

  private async assertValidIndexDest(value: string, managed: boolean): Promise<void> {
    const prefixes = this.allowedDestPrefixes(INDEX_PREFIX, managed);
    this.assertDestValueHasPrefix(value, prefixes);

    let indices: estypes.IndicesResolveIndexResolveIndexItem[] = [];
    let dataStreams: estypes.IndicesResolveIndexResolveIndexDataStreamsItem[] = [];
    try {
      const resolved = await this.esClient.indices.resolveIndex({
        name: value,
        expand_wildcards: ['open', 'hidden', 'closed'],
      });
      indices = resolved.indices;
      dataStreams = resolved.data_streams;
    } catch (error) {
      if (!(isResponseError(error) && error.statusCode === 404)) {
        throw error;
      }
    }

    if (dataStreams.length > 0) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: '${dataStreams[0].name}' is not an index`
      );
    }

    const invalidPrefix = indices.find(
      (index) => !prefixes.some((prefix) => index.name.startsWith(prefix))
    );
    if (invalidPrefix) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: '${invalidPrefix.name}' must start with '${INDEX_PREFIX}'`
      );
    }

    const system = indices.find((index) => index.attributes.includes('system'));
    if (system) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: '${system.name}' is a system index`
      );
    }
  }
}
