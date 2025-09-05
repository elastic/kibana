/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
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

interface CheckpointDocument {
  '@timestamp': string;
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  parent_checkpoint_id: string;
  type: string;
  checkpoint: string;
  metadata: string;
}

interface WritesDocument {
  '@timestamp': string;
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  task_id: string;
  idx: number;
  channel: string;
  value: string;
  type: string;
}

export interface ElasticSearchSaverParams {
  client: ElasticsearchClient;
  logger: Logger;
  checkpointIndex?: string;
  checkpointWritesIndex?: string;
  refreshPolicy?: estypes.Refresh;
}

/**
 * A LangGraph checkpoint saver backed by a Elasticsearch database.
 */
export class ElasticSearchSaver extends BaseCheckpointSaver {
  static defaultCheckpointIndex = 'checkpoints';

  static defaultCheckpointWritesIndex = 'checkpoint_writes';

  /**
   * When modifying the field maps, ensure you perform upgrade testing for all graphs depending on this saver.
   */
  static readonly checkpointsFieldMap = {
    '@timestamp': {
      type: 'date',
      required: true,
      array: false,
    },
    thread_id: { type: 'keyword', required: true, array: false },
    checkpoint_ns: { type: 'keyword', required: true, array: false },
    checkpoint_id: { type: 'keyword', required: false, array: false },
    parent_checkpoint_id: { type: 'keyword', required: true, array: false },
    type: { type: 'keyword', required: true, array: false },
    checkpoint: { type: 'binary', required: true, array: false },
    metadata: { type: 'binary', required: true, array: false },
  } as const;

  /**
   * When modifying the field maps, ensure you perform upgrade testing for all graphs depending on this saver.
   */
  static readonly checkpointWritesFieldMap = {
    '@timestamp': {
      type: 'date',
      required: true,
      array: false,
    },
    thread_id: { type: 'keyword', required: true, array: false },
    checkpoint_ns: { type: 'keyword', required: true, array: false },
    checkpoint_id: { type: 'keyword', required: true, array: false },
    task_id: { type: 'keyword', required: true, array: false },
    idx: { type: 'unsigned_long', required: true, array: false },
    channel: { type: 'keyword', required: true, array: false },
    type: { type: 'keyword', required: true, array: false },
    value: { type: 'binary', required: true, array: false },
  } as const;

  protected client: ElasticsearchClient;
  protected logger: Logger;

  checkpointIndex: string;

  checkpointWritesIndex: string;

  refreshPolicy: estypes.Refresh = 'wait_for';

  constructor(
    {
      client,
      checkpointIndex,
      checkpointWritesIndex,
      refreshPolicy = 'wait_for',
      logger,
    }: ElasticSearchSaverParams,
    serde?: SerializerProtocol
  ) {
    super(serde);
    this.client = client;
    this.checkpointIndex = checkpointIndex ?? ElasticSearchSaver.defaultCheckpointIndex;
    this.checkpointWritesIndex =
      checkpointWritesIndex ?? ElasticSearchSaver.defaultCheckpointWritesIndex;
    this.refreshPolicy = refreshPolicy;
    this.logger = logger;
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

    const result = await this.client.search<CheckpointDocument>({
      index: this.checkpointIndex,
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

    if (result.hits.hits.length === 0 || result.hits.hits[0]?._source === undefined) {
      return undefined;
    }

    const doc = result.hits.hits[0]._source;

    const serializedWrites = await this.client.search<WritesDocument>({
      index: this.checkpointWritesIndex,
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
        const source = serializedWrite._source!;
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

    const result = await this.client.search<CheckpointDocument>({
      index: this.checkpointIndex,
      ...(limit ? { size: limit } : {}),
      sort: [{ checkpoint_id: { order: 'desc' } }, { '@timestamp': { order: 'desc' } }],
      query: {
        bool: {
          must: mustClauses,
        },
      },
    });

    for await (const hit of result.hits.hits) {
      const source = hit._source;
      if (source === undefined) {
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

    const [checkpointType, serializedCheckpoint] = this.serde.dumpsTyped(checkpoint);
    const [metadataType, serializedMetadata] = this.serde.dumpsTyped(metadata);
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

    await this.client.update({
      index: this.checkpointIndex,
      id: compositeId,
      doc,
      doc_as_upsert: true,
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

    const operations = writes.flatMap((write, idx) => {
      const [channel, value] = write;

      const compositeId = `thread_id:${threadId}|checkpoint_ns:${checkpointNs}|checkpoint_id:${checkpointId}|task_id:${taskId}|idx:${idx}`;
      const [type, serializedValue] = this.serde.dumpsTyped(value);

      const doc: WritesDocument = {
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

      return [
        {
          update: {
            _index: this.checkpointWritesIndex,
            _id: compositeId,
          },
        },
        { doc, doc_as_upsert: true },
      ];
    });

    const result = await this.client.bulk({
      operations,
      refresh: this.refreshPolicy,
      error_trace: true,
    });

    if (result.errors) {
      this.logger.error(`Failed to index writes for checkpoint ${checkpointId}`);

      throw new Error(`Failed to index writes for checkpoint ${checkpointId}`);
    }
  }
}
