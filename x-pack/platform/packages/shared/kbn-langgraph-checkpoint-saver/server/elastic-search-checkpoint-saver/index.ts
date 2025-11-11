/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { CheckpointPendingWrite } from '@langchain/langgraph-checkpoint';
import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointListOptions,
  type CheckpointTuple,
  type SerializerProtocol,
  type PendingWrite,
  type CheckpointMetadata,
} from '@langchain/langgraph-checkpoint';
import type { InternalIStorageClient } from '@kbn/storage-adapter';

interface CheckpointDocument {
  _id?: string;
  '@timestamp': string;
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  parent_checkpoint_id: string;
  type: string;
  checkpoint: string;
  metadata: string;
}

interface CheckpointWriteDocument {
  _id?: string;
  '@timestamp': string;
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  task_id: string;
  idx: number;
  channel: string;
  type: string;
  value: string;
}
export interface ElasticSearchSaverParams {
  logger: Logger;
  checkpointIndex?: string;
  checkpointWritesIndex?: string;
  refreshPolicy?: estypes.Refresh;
  /**
   * Storage adapter for checkpoints index.
   * Ensures index templates and indices are created automatically.
   */
  checkpointsStorage: InternalIStorageClient<CheckpointDocument>;
  /**
   * Storage adapter for checkpoint writes index.
   * Ensures index templates and indices are created automatically.
   */
  checkpointWritesStorage: InternalIStorageClient<CheckpointWriteDocument>;
}

/**
 * A LangGraph checkpoint saver backed by a Elasticsearch database.
 */
export class ElasticSearchSaver extends BaseCheckpointSaver {
  static defaultCheckpointIndex = 'checkpoints';

  static defaultCheckpointWritesIndex = 'checkpoint_writes';

  protected logger: Logger;

  checkpointIndex: string;

  checkpointWritesIndex: string;

  refreshPolicy: estypes.Refresh = 'wait_for';

  private checkpointsStorage: InternalIStorageClient<CheckpointDocument>;
  private checkpointWritesStorage: InternalIStorageClient<CheckpointWriteDocument>;

  constructor(
    {
      checkpointIndex,
      checkpointWritesIndex,
      refreshPolicy = 'wait_for',
      logger,
      checkpointsStorage,
      checkpointWritesStorage,
    }: ElasticSearchSaverParams,
    serde?: SerializerProtocol
  ) {
    super(serde);
    this.checkpointIndex = checkpointIndex ?? ElasticSearchSaver.defaultCheckpointIndex;
    this.checkpointWritesIndex =
      checkpointWritesIndex ?? ElasticSearchSaver.defaultCheckpointWritesIndex;
    this.refreshPolicy = refreshPolicy;
    this.logger = logger;
    this.checkpointsStorage = checkpointsStorage;
    this.checkpointWritesStorage = checkpointWritesStorage;
  }

  /**
   * Retrieves a checkpoint from Elasticsearch based on the
   * provided config. If the config contains a "checkpoint_id" key, the checkpoint with
   * the matching thread ID and checkpoint ID is retrieved. Otherwise, the latest checkpoint
   * for the given thread ID is retrieved.
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const {
      thread_id: threadId,
      checkpoint_ns: checkpointNs = '',
      checkpoint_id: checkpointId,
    } = config.configurable ?? {};

    const result = await this.checkpointsStorage.search({
      track_total_hits: true,
      size: 1,
      sort: [{ checkpoint_id: { order: 'desc' } }],
      query: {
        bool: {
          must: [
            { term: { thread_id: threadId } },
            { term: { checkpoint_ns: checkpointNs } },
            ...(checkpointId ? [{ term: { checkpoint_id: checkpointId } }] : []),
          ],
        },
      },
    });

    if (result.hits.hits.length === 0 || !result.hits.hits[0]) {
      return undefined;
    }

    // Storage adapter always returns _source
    const doc = result.hits.hits[0]._source;

    const serializedWrites = await this.checkpointWritesStorage.search({
      track_total_hits: true,
      size: 10000,
      sort: [{ idx: { order: 'asc' } }],
      query: {
        bool: {
          must: [
            // todo(@KDKHD): fix this query to remove the duplicate should clauses. Ensure both tests and the elastic assistant work.
            {
              bool: {
                should: [
                  { term: { thread_id: threadId } },
                  { term: { 'thread_id.keyword': threadId } },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  { term: { checkpoint_ns: checkpointNs } },
                  { term: { 'checkpoint_ns.keyword': checkpointNs } },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  { term: { checkpoint_id: doc.checkpoint_id } },
                  { term: { 'checkpoint_id.keyword': doc.checkpoint_id } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    });

    const checkpoint = (await this.serde.loadsTyped(
      doc.type,
      new Uint8Array(Buffer.from(doc.checkpoint, 'base64'))
    )) as Checkpoint;

    const pendingWrites: CheckpointPendingWrite[] = await Promise.all(
      serializedWrites.hits.hits.map(async (serializedWrite) => {
        // Storage adapter always returns _source
        const source = serializedWrite._source;
        return [
          source.task_id,
          source.channel,
          await this.serde.loadsTyped(
            source.type,
            new Uint8Array(Buffer.from(source.value, 'base64'))
          ),
        ] as CheckpointPendingWrite;
      })
    );

    const configurableValues = {
      thread_id: threadId,
      checkpoint_ns: checkpointNs,
      checkpoint_id: doc.checkpoint_id,
    };

    return {
      config: { configurable: configurableValues },
      checkpoint,
      pendingWrites,
      metadata: (await this.serde.loadsTyped(
        doc.type,
        new Uint8Array(Buffer.from(doc.metadata, 'base64'))
      )) as CheckpointMetadata,
      parentConfig:
        doc.parent_checkpoint_id != null
          ? {
              configurable: {
                thread_id: threadId,
                checkpoint_ns: checkpointNs,
                checkpoint_id: doc.parent_checkpoint_id,
              },
            }
          : undefined,
    };
  }

  /**
   * Retrieve a list of checkpoint tuples from Elasticsearch based
   * on the provided config. The checkpoints are ordered by checkpoint ID
   * in descending order (newest first).
   */
  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions
  ): AsyncGenerator<CheckpointTuple> {
    const { limit, before } = options ?? {};
    const mustClauses = [];

    if (config?.configurable?.thread_id) {
      mustClauses.push({ term: { thread_id: config.configurable.thread_id } });
    }

    if (
      config?.configurable?.checkpoint_ns !== undefined &&
      config?.configurable?.checkpoint_ns !== null
    ) {
      mustClauses.push({
        term: { checkpoint_ns: config.configurable.checkpoint_ns },
      });
    }

    if (before) {
      mustClauses.push({
        range: { checkpoint_id: { lt: before.configurable?.checkpoint_id } },
      });
    }

    const result = await this.checkpointsStorage.search({
      track_total_hits: true,
      ...(limit ? { size: limit } : { size: 10000 }),
      sort: [{ checkpoint_id: { order: 'desc' } }, { '@timestamp': { order: 'desc' } }],
      query: {
        bool: {
          must: mustClauses,
        },
      },
    });

    for await (const hit of result.hits.hits) {
      // Storage adapter always returns _source
      const source = hit._source;
      if (!source) {
        continue;
      }
      const checkpoint = (await this.serde.loadsTyped(
        source.type,
        new Uint8Array(Buffer.from(source.checkpoint, 'base64'))
      )) as Checkpoint;
      const metadata = (await this.serde.loadsTyped(
        source.type,
        new Uint8Array(Buffer.from(source.metadata, 'base64'))
      )) as CheckpointMetadata;
      yield {
        config: {
          configurable: {
            thread_id: source.thread_id,
            checkpoint_ns: source.checkpoint_ns,
            checkpoint_id: source.checkpoint_id,
          },
        },
        checkpoint,
        metadata,
        parentConfig: source.parent_checkpoint_id
          ? {
              configurable: {
                thread_id: source.thread_id,
                checkpoint_ns: source.checkpoint_ns,
                checkpoint_id: source.parent_checkpoint_id,
              },
            }
          : undefined,
      };
    }
  }

  /**
   * Saves a checkpoint to the Elasticsearch. The checkpoint is associated
   * with the provided config and its parent config (if any).
   */
  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    this.logger.debug(
      `Putting checkpoint ${checkpoint.id} for thread ${config.configurable?.thread_id}`
    );

    const threadId = config.configurable?.thread_id;

    const checkpointNs = config.configurable?.checkpoint_ns ?? '';
    const checkpointId = checkpoint.id;
    if (threadId === undefined) {
      throw new Error(
        `The provided config must contain a configurable field with a "thread_id" field.`
      );
    }

    const [checkpointType, serializedCheckpoint] = await this.serde.dumpsTyped(checkpoint);
    const [metadataType, serializedMetadata] = await this.serde.dumpsTyped(metadata);
    if (checkpointType !== metadataType) {
      throw new Error('Mismatched checkpoint and metadata types.');
    }

    const doc: CheckpointDocument = {
      '@timestamp': new Date().toISOString(),
      thread_id: threadId,
      checkpoint_ns: checkpointNs,
      checkpoint_id: checkpointId,

      parent_checkpoint_id: config.configurable?.checkpoint_id,
      type: checkpointType,
      checkpoint: Buffer.from(serializedCheckpoint).toString('base64'),
      metadata: Buffer.from(serializedMetadata).toString('base64'),
    };

    const compositeId = `thread_id:${threadId}|checkpoint_ns:${checkpointNs}|checkpoint_id:${checkpointId}`;

    // Use storage adapter which handles index creation automatically
    await this.checkpointsStorage.index({
      id: compositeId,
      document: doc,
      refresh: this.refreshPolicy,
    });

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpointId,
      },
    };
  }

  /**
   * Saves intermediate writes associated with a checkpoint to Elastic Search.
   */
  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    this.logger.debug(`Putting writes for checkpoint ${config.configurable?.checkpoint_id}`);
    const threadId = config.configurable?.thread_id;

    const checkpointNs = config.configurable?.checkpoint_ns;

    const checkpointId = config.configurable?.checkpoint_id;
    if (threadId === undefined || checkpointNs === undefined || checkpointId === undefined) {
      throw new Error(
        `The provided config must contain a configurable field with "thread_id", "checkpoint_ns" and "checkpoint_id" fields.`
      );
    }

    // Use storage adapter which handles index creation automatically
    const operations = await Promise.all(
      writes.map(async (write, idx) => {
        const [channel, value] = write;

        const compositeId = `thread_id:${threadId}|checkpoint_ns:${checkpointNs}|checkpoint_id:${checkpointId}|task_id:${taskId}|idx:${idx}`;
        const [type, serializedValue] = await this.serde.dumpsTyped(value);

        const doc = {
          '@timestamp': new Date().toISOString(),
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: checkpointId,
          task_id: taskId,
          idx,
          channel,
          value: Buffer.from(serializedValue).toString('base64'),
          type,
        };

        this.logger.debug(`Indexing write operation for checkpoint ${checkpointId}`);

        return {
          index: {
            _id: compositeId,
            document: doc,
          },
        };
      })
    );

    const result = await this.checkpointWritesStorage.bulk({
      operations,
      refresh: this.refreshPolicy,
    });

    if (result.errors) {
      this.logger.error(`Failed to index writes for checkpoint ${checkpointId}`);
      throw new Error(`Failed to index writes for checkpoint ${checkpointId}`);
    }
  }

  // TODO: Implement this
  async deleteThread() {}
}
