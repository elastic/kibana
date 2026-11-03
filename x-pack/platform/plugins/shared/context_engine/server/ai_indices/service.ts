/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
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
import { isIndexPattern } from '../../common/ai_index_dest';
import { AI_INDEX_ID_PATTERN } from '../../common/validation';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexManagedError,
  AiIndexNotFoundError,
  AiIndexIdConflictError,
  AiIndexAlreadyExistsError,
} from './errors';
import type { AiIndexRecord, AiIndexRecordWrite } from './registry_api';
import {
  deleteAiIndexRecord,
  getAiIndexRecord,
  listAiIndexRecords,
  putAiIndexRecord,
} from './registry_api';
import { buildTraceQueries } from './trace_queries';

const resolveMemoryEnabled = (record: Pick<AiIndexRecord, 'managed' | 'memory_enabled'>): boolean =>
  record.memory_enabled ?? !record.managed;

const toAiIndexItem = (record: AiIndexRecord): AiIndexHttpItem => ({
  id: record.id,
  ...(record.description !== undefined && { description: record.description }),
  ...(record.feedback_analysis !== undefined && {
    feedback_analysis: record.feedback_analysis,
  }),
  managed: record.managed ?? false,
  memory_enabled: resolveMemoryEnabled(record),
  dest: record.dest,
  automations: record.automations,
  sources: record.sources,
  traces: buildTraceQueries(record.traces ?? [], record.space),
  date_created: record.date_created,
  date_modified: record.date_modified,
});

/** Some fields need to be read from config (registration object), and some from the registry. */
const mergeManagedAiIndex = (
  registration: AiIndexProperties,
  record: AiIndexRecord
): AiIndexRecord => ({
  ...record,
  dest: registration.dest,
});

/** The writable part of a stored record, for a read-then-replace. */
const toRecordWrite = ({
  id: _id,
  date_created: _dateCreated,
  date_modified: _dateModified,
  ...record
}: AiIndexRecord): AiIndexRecordWrite => record;

export interface AiIndexManagedBootstrap {
  isManaged: (id: string) => boolean;
  getManagedIds: () => string[];
  getRegistration: (id: string) => AiIndexProperties | undefined;
  ensure: (id: string, spaceId: string) => Promise<boolean>;
}

type AiIndexAutomationTarget = Pick<AiIndexRecord, 'managed' | 'automations'>;

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
 * Manages the AI index registry through the Elasticsearch `_context_engine/ai_index` API, which
 * owns the `.context-engine-ai-indices` system index. Reads and writes go through the internal
 * user; access is enforced at the API layer.
 */
export class AiIndexService {
  private readonly esClient: ElasticsearchClient;
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
    this.managedBootstrap = managedBootstrap;
    this.logger = logger;
  }

  /** Creates a new AI index. Duplicate ids throw {@link AiIndexAlreadyExistsError}. */
  async create(aiIndexId: string, spaceId: string, properties: AiIndexProperties): Promise<void> {
    if (this.managedBootstrap?.isManaged(aiIndexId)) {
      throw new AiIndexManagedError(aiIndexId);
    }
    await this.assertValidDest(properties.dest);

    const existing = await this.findRecord(aiIndexId, spaceId);
    if (existing) {
      throw new AiIndexAlreadyExistsError(aiIndexId);
    }

    // The API's `create` flag closes the window between the read above and this write.
    await this.writeRecord(
      aiIndexId,
      { ...properties, space: spaceId, managed: false },
      { create: true }
    );
  }

  /**
   * Creates or fully replaces an AI index; the API preserves `date_created` on a replace.
   * Managed entries (registered by a plugin at startup) are immutable via this method.
   */
  async put(
    aiIndexId: string,
    spaceId: string,
    properties: AiIndexProperties
  ): Promise<'created' | 'updated'> {
    await this.assertValidDest(properties.dest);

    const existing = await this.findRecord(aiIndexId, spaceId);
    if (existing?.managed || (!existing && this.managedBootstrap?.isManaged(aiIndexId))) {
      throw new AiIndexManagedError(aiIndexId);
    }

    return this.writeRecord(aiIndexId, { ...properties, space: spaceId, managed: false });
  }

  /**
   * Creates a managed AI index. Managed entries are owned by the registering plugin and cannot
   * be mutated via the public API.
   *
   * This is a create-only write that tolerates an existing managed entry (which is left as it
   * is, since its dest is resolved against the registration on read), but refuses to clobber a
   * user-owned (unmanaged) entry that squats the same id, throwing
   * {@link AiIndexIdConflictError} so the collision surfaces instead of silently destroying
   * user data.
   */
  async putManaged(
    aiIndexId: string,
    spaceId: string,
    properties: AiIndexProperties
  ): Promise<'created' | 'updated'> {
    await this.assertValidDest(properties.dest, { managed: true });
    const existing = await this.findRecord(aiIndexId, spaceId);
    if (existing) {
      if (!existing.managed) {
        throw new AiIndexIdConflictError(aiIndexId);
      }
      return 'updated';
    }
    try {
      return await this.writeRecord(
        aiIndexId,
        {
          ...properties,
          space: spaceId,
          managed: true,
          memory_enabled: properties.memory_enabled ?? false,
        },
        { create: true }
      );
    } catch (error) {
      // A concurrent bootstrap of the same managed entry won; its record is as good as ours.
      if (error instanceof AiIndexConflictError) {
        return 'updated';
      }
      throw error;
    }
  }

  private async writeRecord(
    aiIndexId: string,
    record: AiIndexRecordWrite,
    { create = false }: { create?: boolean } = {}
  ): Promise<'created' | 'updated'> {
    try {
      const { result } = await putAiIndexRecord(this.esClient, {
        id: aiIndexId,
        record: { ...record, memory_enabled: record.memory_enabled ?? true },
        create,
      });
      return result;
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
    const existing = await this.findRecord(aiIndexId, spaceId);
    if (!existing) {
      throw new AiIndexNotFoundError(aiIndexId);
    }

    // The dest is unchanged, so it is not re-validated here: an index whose
    // backing store was deleted after registration must still be switchable
    // off.
    // A read-then-replace: the registry API offers no optimistic concurrency control, so the
    // previous seq_no/primary_term guard is gone and the last writer wins.
    await this.writeRecord(aiIndexId, {
      ...toRecordWrite(existing),
      memory_enabled: resolveMemoryEnabled(existing),
      feedback_analysis: feedbackAnalysis,
    });

    return feedbackAnalysis;
  }

  async get(aiIndexId: string, spaceId: string): Promise<AiIndexHttpItem> {
    const existing = await this.findRecord(aiIndexId, spaceId);
    if (existing) {
      return this.toItem(existing);
    }
    if (!this.managedBootstrap?.isManaged(aiIndexId)) {
      throw new AiIndexNotFoundError(aiIndexId);
    }
    await this.managedBootstrap.ensure(aiIndexId, spaceId);
    const newManagedAiIndex = await this.findRecord(aiIndexId, spaceId);
    if (!newManagedAiIndex) {
      throw new AiIndexNotFoundError(aiIndexId);
    }
    return this.toItem(newManagedAiIndex);
  }

  /**
   * Fail-fast validation before expensive side effects.
   */
  async assertCanAcceptAutomation(
    aiIndexId: string,
    spaceId: string,
    automation?: { type: 'workflow'; value: string }
  ): Promise<void> {
    const existing = await this.findRecord(aiIndexId, spaceId);
    if (!existing) {
      throw new AiIndexNotFoundError(aiIndexId);
    }

    assertAiIndexAcceptsAutomation(aiIndexId, existing, automation);
  }

  /**
   * Appends a workflow automation to an AI index.
   */
  async addAutomation(
    aiIndexId: string,
    spaceId: string,
    automation: { type: 'workflow'; value: string }
  ): Promise<'attached' | 'already_attached'> {
    const existing = await this.findRecord(aiIndexId, spaceId);
    if (!existing) {
      throw new AiIndexNotFoundError(aiIndexId);
    }

    const { alreadyAttached } = assertAiIndexAcceptsAutomation(aiIndexId, existing, automation);
    if (alreadyAttached) {
      return 'already_attached';
    }

    // A read-then-replace: the registry API offers no optimistic concurrency control, so the
    // previous conflict-retry loop is gone and two concurrent appends can lose one automation.
    await this.writeRecord(aiIndexId, {
      ...toRecordWrite(existing),
      automations: [...existing.automations, automation],
    });

    return 'attached';
  }

  async list(spaceId: string): Promise<AiIndexHttpItem[]> {
    const items = await this.listSpace(spaceId);
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
    return this.listSpace(spaceId);
  }

  /**
   * Deletes the AI index entry only; backing indices are left untouched.
   * Managed entries cannot be deleted via the API.
   */
  async delete(aiIndexId: string, spaceId: string): Promise<void> {
    const existing = await this.findRecord(aiIndexId, spaceId);
    if (!existing) {
      throw new AiIndexNotFoundError(aiIndexId);
    }
    if (existing.managed) {
      throw new AiIndexManagedError(aiIndexId);
    }
    // Re-check the delete result: the entry may have been removed concurrently
    // between the existence lookup above and this call.
    const deleted = await deleteAiIndexRecord(this.esClient, { id: aiIndexId, space: spaceId });
    if (!deleted) {
      throw new AiIndexNotFoundError(aiIndexId);
    }
  }

  private async listSpace(spaceId: string): Promise<AiIndexHttpItem[]> {
    const records = await listAiIndexRecords(this.esClient, {
      space: spaceId,
      size: MAX_AI_INDICES,
    });
    return records.map((record) => this.toItem(record));
  }

  /** Managed records are resolved against their registration on read; user-owned ones are returned as stored. */
  private toItem(record: AiIndexRecord): AiIndexHttpItem {
    const registration = record.managed
      ? this.managedBootstrap?.getRegistration(record.id)
      : undefined;
    return toAiIndexItem(registration ? mergeManagedAiIndex(registration, record) : record);
  }

  private findRecord(aiIndexId: string, spaceId: string): Promise<AiIndexRecord | undefined> {
    return getAiIndexRecord(this.esClient, { id: aiIndexId, space: spaceId });
  }

  /**
   * The dest value must name a single index or data stream, follow the
   * type-specific naming convention, and match the declared `type`. A managed
   * entry may also use the dot-prefixed form, which is reserved for
   * Kibana-internal backing stores.
   */
  private async assertValidDest(
    { type, value }: AiIndexDest,
    { managed = false }: { managed?: boolean } = {}
  ): Promise<void> {
    if (isIndexPattern(value)) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: it must name a single index or data stream, not a pattern`
      );
    }
    if (type === 'data_stream') {
      await this.assertValidDataStreamDest(value, managed);
    } else {
      await this.assertValidIndexDest(value, managed);
    }
  }

  private allowedDestPrefixes(basePrefix: string, managed: boolean): string[] {
    return managed ? [basePrefix, `.${basePrefix}`] : [basePrefix];
  }

  /** The dest value must be a type-specific prefix followed by a valid AI index id. */
  private assertDestValueFormat(value: string, prefixes: string[]): void {
    const prefix = prefixes.find((candidate) => value.startsWith(candidate));
    if (prefix === undefined) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: it must start with '${prefixes[0]}'`
      );
    }
    if (!AI_INDEX_ID_PATTERN.test(value.slice(prefix.length))) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: the part after '${prefix}' must be a valid AI index id`
      );
    }
  }

  /** Resolves the dest name, rejecting aliases since they cannot be a single write target. */
  private async resolveDest(value: string): Promise<{
    indices: estypes.IndicesResolveIndexResolveIndexItem[];
    dataStreams: estypes.IndicesResolveIndexResolveIndexDataStreamsItem[];
  }> {
    let resolved: estypes.IndicesResolveIndexResponse;
    try {
      resolved = await this.esClient.indices.resolveIndex({
        name: value,
        expand_wildcards: ['open', 'hidden', 'closed'],
      });
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return { indices: [], dataStreams: [] };
      }
      throw error;
    }

    if (resolved.aliases.length > 0) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: '${resolved.aliases[0].name}' is an alias`
      );
    }
    return { indices: resolved.indices, dataStreams: resolved.data_streams };
  }

  private async assertValidDataStreamDest(value: string, managed: boolean): Promise<void> {
    const prefixes = this.allowedDestPrefixes(DATA_STREAM_PREFIX, managed);
    this.assertDestValueFormat(value, prefixes);

    const { indices, dataStreams } = await this.resolveDest(value);

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
    this.assertDestValueFormat(value, prefixes);

    const { indices, dataStreams } = await this.resolveDest(value);

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
