/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { MAX_AI_INDICES } from '../../common/constants';
import type {
  AiIndexDest,
  AiIndexHttpItem,
  AiIndexProperties,
} from '../../common/http_api/ai_indices';
import { InvalidAiIndexDestError, AiIndexConflictError, AiIndexNotFoundError } from './errors';
import type { AiIndexDocument, AiIndexStorageClient } from './storage';
import { createAiIndexStorageClient } from './storage';

/**
 * Backing data streams and indices follow type-specific naming conventions,
 * both sharing the common `ai-index-` base.
 */
const DEST_INDEX_PREFIX = 'ai-index-';
const DATA_STREAM_PREFIX = `${DEST_INDEX_PREFIX}ds-`;
const INDEX_PREFIX = `${DEST_INDEX_PREFIX}idx-`;

const toAiIndexItem = (id: string, document: AiIndexDocument): AiIndexHttpItem => ({
  id,
  name: document.name,
  ...(document.description !== undefined && { description: document.description }),
  dest: document.dest,
  automations: document.automations,
  sources: document.sources,
  date_created: document.date_created,
  date_modified: document.date_modified,
});

/**
 * Manages the AI index registry stored in the hidden
 * `.contextengine-ai-indices` system index. Reads and writes go through the
 * internal user; access is enforced at the API layer.
 */
export class AiIndexService {
  private readonly esClient: ElasticsearchClient;
  private readonly storageClient: AiIndexStorageClient;

  constructor({ esClient, logger }: { esClient: ElasticsearchClient; logger: Logger }) {
    this.esClient = esClient;
    this.storageClient = createAiIndexStorageClient({ esClient, logger });
  }

  /**
   * Creates or fully replaces an AI index, preserving `date_created` on update.
   * Concurrent writes are guarded with optimistic concurrency control; a losing
   * writer gets a {@link AiIndexConflictError}.
   */
  async put(aiIndexId: string, properties: AiIndexProperties): Promise<'created' | 'updated'> {
    await this.assertValidDest(properties.dest);

    const existing = await this.findDocument(aiIndexId);
    const now = new Date().toISOString();
    const document: AiIndexDocument = {
      ...properties,
      date_created: existing?.document.date_created ?? now,
      date_modified: now,
    };

    try {
      if (existing) {
        await this.storageClient.index({
          id: aiIndexId,
          document,
          if_seq_no: existing.seqNo,
          if_primary_term: existing.primaryTerm,
        });
        return 'updated';
      }

      await this.storageClient.index({ id: aiIndexId, document, op_type: 'create' });
      return 'created';
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 409) {
        throw new AiIndexConflictError(aiIndexId);
      }
      throw error;
    }
  }

  async get(aiIndexId: string): Promise<AiIndexHttpItem> {
    const existing = await this.findDocument(aiIndexId);
    if (!existing) {
      throw new AiIndexNotFoundError(aiIndexId);
    }
    return toAiIndexItem(aiIndexId, existing.document);
  }

  async list(): Promise<AiIndexHttpItem[]> {
    const response = await this.storageClient.search({
      size: MAX_AI_INDICES,
      track_total_hits: false,
      sort: [{ name: 'asc' }],
    });
    return response.hits.hits.flatMap((hit) =>
      hit._id ? [toAiIndexItem(hit._id, hit._source as AiIndexDocument)] : []
    );
  }

  /**
   * Deletes the AI index entry only; backing indices are left untouched.
   */
  async delete(aiIndexId: string): Promise<void> {
    const { result } = await this.storageClient.delete({ id: aiIndexId });
    if (result === 'not_found') {
      throw new AiIndexNotFoundError(aiIndexId);
    }
  }

  private async findDocument(aiIndexId: string): Promise<
    | {
        document: AiIndexDocument;
        seqNo?: number;
        primaryTerm?: number;
      }
    | undefined
  > {
    try {
      // seq_no_primary_term is required for the OCC assertions in `put`: the
      // storage client's get is search-based, and search hits only carry
      // _seq_no/_primary_term when explicitly requested.
      const response = await this.storageClient.get({ id: aiIndexId, seq_no_primary_term: true });
      if (!response.found || !response._source) {
        return undefined;
      }
      return {
        document: response._source,
        seqNo: response._seq_no,
        primaryTerm: response._primary_term,
      };
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * The dest value must follow the type-specific naming convention and match
   * the declared `type`.
   */
  private async assertValidDest({ type, value }: AiIndexDest): Promise<void> {
    if (type === 'data_stream') {
      await this.assertValidDataStreamDest(value);
    } else {
      await this.assertValidIndexDest(value);
    }
  }

  /**
   * Every expression in the dest value must start with the type-specific
   * prefix.
   */
  private assertDestValueHasPrefix(value: string, prefix: string): void {
    const invalid = value.split(',').find((expression) => !expression.startsWith(prefix));
    if (invalid !== undefined) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: every expression must start with '${prefix}'`
      );
    }
  }

  private async assertValidDataStreamDest(value: string): Promise<void> {
    this.assertDestValueHasPrefix(value, DATA_STREAM_PREFIX);

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

    const invalidPrefix = dataStreams.find((ds) => !ds.name.startsWith(DATA_STREAM_PREFIX));
    if (invalidPrefix) {
      throw new InvalidAiIndexDestError(
        `dest.value '${value}' is not allowed: '${invalidPrefix.name}' must start with '${DATA_STREAM_PREFIX}'`
      );
    }
  }

  private async assertValidIndexDest(value: string): Promise<void> {
    this.assertDestValueHasPrefix(value, INDEX_PREFIX);

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

    const invalidPrefix = indices.find((index) => !index.name.startsWith(INDEX_PREFIX));
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
