/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, errors } from '@elastic/elasticsearch';
import { Logger } from '@kbn/logging';
import { v4 as uuid } from 'uuid';
import pRetry from 'p-retry';
import prettyMilliseconds from 'pretty-ms';
import { once } from 'lodash';

export const LOCKS_INDEX_ALIAS = '.kibana_locks';
export const LOCKS_CONCRETE_INDEX_NAME = `${LOCKS_INDEX_ALIAS}-000001`;

export enum LockId {
  KnowledgeBaseReindex = 'knowledge_base_reindex',
}

export interface LockDocument {
  createdAt: string;
  expiresAt: string;
  metadata: Record<string, any>;
  token: string;
}

interface AcquireOptions {
  metadata?: Record<string, any>;
  ttlMs?: number;
}

const createLocksWriteIndexOnce = once(createLocksWriteIndex);

export class LockManager {
  private token = uuid();

  constructor(private lockId: LockId, private esClient: Client, private logger: Logger) {
    logger.debug(`LockManager initialized with lockId: ${lockId}`);
  }

  /**
   * Attempts to acquire a lock by creating a document with the given lockId.
   * If the lock exists and is expired, it will be released and acquisition retried.
   */
  public async acquire(options: AcquireOptions = {}): Promise<boolean> {
    await createLocksWriteIndexOnce(this.esClient);

    this.token = uuid();
    const ttl = options.ttlMs ?? 6 * 5 * 1000; // Default TTL: 5 minutes

    this.logger.debug(
      `Acquiring lock "${this.lockId}" with ttl = ${prettyMilliseconds(ttl)} and token = ${
        this.token
      }`
    );

    try {
      const response = await this.esClient.update<LockDocument>({
        index: LOCKS_CONCRETE_INDEX_NAME,
        id: this.lockId,
        scripted_upsert: true,
        script: {
          lang: 'painless',
          source: `
              // Get the current time on the ES server.
              long now = System.currentTimeMillis();
              
              // If creating the document or if the lock is expired, update it.
              if (ctx.op == 'create' || Instant.parse(ctx._source.expiresAt).toEpochMilli() < now) {
                ctx._source.createdAt = Instant.ofEpochMilli(now).toString();
                ctx._source.expiresAt = Instant.ofEpochMilli(now + params.ttl).toString();
                ctx._source.metadata = params.metadata;
                ctx._source.token = params.token;
              } else {
                ctx.op = 'noop'
              }
            `,
          params: {
            token: this.token,
            ttl,
            metadata: options.metadata ?? {},
          },
        },
        // @ts-expect-error
        upsert: {},
        refresh: true,
      });

      if (response.result === 'created') {
        this.logger.debug(
          `Lock "${this.lockId}" acquired with ttl = ${prettyMilliseconds(ttl)} and token = ${
            this.token
          }`
        );
        return true;
      } else if (response.result === 'updated') {
        this.logger.debug(
          ` Lock "${this.lockId}" was expired and re-acquired with ttl = ${prettyMilliseconds(
            ttl
          )} and token = ${this.token}`
        );
        return true;
      } else if (response.result === 'noop') {
        this.logger.debug(
          `Lock "${this.lockId}" could not be acquired with token ${this.token} because it is already held`
        );
        return false;
      } else {
        throw new Error(`Unexpected response: ${response.result}`);
      }
    } catch (e) {
      if (
        e instanceof errors.ResponseError &&
        e.body?.error?.type === 'version_conflict_engine_exception'
      ) {
        this.logger.debug(`Lock "${this.lockId}" already held (version conflict)`);
        return false;
      }

      this.logger.error(`Failed to acquire lock "${this.lockId}": ${e.message}`);
      this.logger.debug(e);
      return false;
    }
  }

  /**
   * Releases the lock by deleting the document with the given lockId and token
   */
  public async release(): Promise<boolean> {
    try {
      const res = await pRetry(
        () => {
          return this.esClient.deleteByQuery({
            index: LOCKS_CONCRETE_INDEX_NAME,
            query: {
              // bool: { filter: [{ term: { _id: this.lockId } }, { term: { token: this.token } }] },
              bool: { filter: [{ term: { _id: this.lockId } }, { term: { token: this.token } }] },
            },
            refresh: true,
          });
        },
        { retries: 2 }
      );

      if (res.deleted === 0) {
        this.logger.debug(
          `Lock "${this.lockId}" with token = ${this.token} could not be released. Not found or already released.`
        );
        return false;
      }

      this.logger.debug(`Lock "${this.lockId}" with token = ${this.token} was released.`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to release lock "${this.lockId}": ${error.message}`);
      this.logger.debug(error);
      return false;
    }
  }

  /**
   * Releases a lock if it is expired.
   */
  public async releaseIfExpired(): Promise<boolean> {
    const res = await this.esClient.deleteByQuery({
      index: LOCKS_CONCRETE_INDEX_NAME,
      query: {
        bool: {
          filter: [{ term: { _id: this.lockId } }, { range: { expiresAt: { lte: 'now' } } }],
        },
      },
      refresh: true,
    });
    if (res.deleted === 0) {
      this.logger.debug(`Lock "${this.lockId}" not found`);
      return false;
    }

    this.logger.debug(`Lock "${this.lockId}" expired and was released.`);
    return true;
  }

  /**
   * Retrieves the lock document for a given lockId.
   * If the lock is expired, it will be released.
   */
  public async get(): Promise<LockDocument | undefined> {
    const result = await this.esClient.search<LockDocument>({
      index: LOCKS_CONCRETE_INDEX_NAME,
      query: {
        bool: {
          filter: [{ term: { _id: this.lockId } }, { range: { expiresAt: { gt: 'now' } } }],
        },
      },
    });

    const hits = result.hits.hits;
    if (hits.length === 0) {
      await this.releaseIfExpired();
      return undefined;
    }

    return hits[0]._source;
  }

  public async waitForLock(options: AcquireOptions & pRetry.Options = {}): Promise<boolean> {
    const { metadata, ttlMs, ...pRetryOptions } = options;

    return pRetry(async () => {
      const acquired = await this.acquire({ metadata, ttlMs });
      if (!acquired) {
        this.logger.debug(`Lock "${this.lockId}" not available yet.`);
        throw new Error(`Lock "${this.lockId}" not available yet`);
      }
      return acquired;
    }, pRetryOptions ?? { forever: true, maxTimeout: 10_000 });
  }

  public async extendTtl(ttl = 300000): Promise<boolean> {
    try {
      await this.esClient.update<LockDocument>({
        index: LOCKS_CONCRETE_INDEX_NAME,
        id: this.lockId,
        script: {
          lang: 'painless',
          source: `
          long now = System.currentTimeMillis();
          ctx._source.expiresAt = Instant.ofEpochMilli(now + params.ttl).toString();`,
          params: { ttl },
        },
        refresh: true,
      });
      this.logger.debug(`Lock "${this.lockId}" extended ttl with ${prettyMilliseconds(ttl)}.`);
      return true;
    } catch (error) {
      if (
        error instanceof errors.ResponseError &&
        error.message.includes('version_conflict_engine_exception') &&
        error.message.includes('but no document was found')
      ) {
        this.logger.debug(`Lock "${this.lockId}" was released concurrently. Not extending TTL.`);
        return false;
      }

      this.logger.error(`Failed to extend lock "${this.lockId}": ${error.message}`);
      this.logger.debug(error);
      return false;
    }
  }
}

export async function withLock<T>(
  {
    lockId,
    esClient,
    logger,
    metadata,
    ttlMs = 60 * 5 * 1000, // Default TTL: 5 minutes
  }: {
    lockId: LockId;
    esClient: Client;
    logger: Logger;
  } & AcquireOptions,
  callback: () => Promise<T>
): Promise<T | undefined> {
  const lockManager = new LockManager(lockId, esClient, logger);
  const acquired = await lockManager.acquire({ metadata, ttlMs });

  // extend the ttl periodically
  const extendInterval = Math.floor(ttlMs / 2);
  const intervalId = setInterval(async () => {
    try {
      await lockManager.extendTtl();
    } catch (err) {
      logger.error(`Failed to extend lock "${lockId}":`, err);
    }
  }, extendInterval);

  if (acquired) {
    try {
      return await callback();
    } finally {
      clearInterval(intervalId);
      await lockManager.release();
    }
  }
  return undefined;
}

export async function ensureTemplatesAndIndexCreated(esClient: Client): Promise<void> {
  const COMPONENT_TEMPLATE_NAME = `${LOCKS_INDEX_ALIAS}-component`;
  const INDEX_TEMPLATE_NAME = `${LOCKS_INDEX_ALIAS}-index-template`;
  const INDEX_PATTERN = `${LOCKS_INDEX_ALIAS}*`;

  await esClient.cluster.putComponentTemplate({
    name: COMPONENT_TEMPLATE_NAME,
    template: {
      mappings: {
        dynamic: false,
        properties: {
          token: { type: 'keyword' },
          metadata: { enabled: false },
          createdAt: { type: 'date' },
          expiresAt: { type: 'date' },
        },
      },
    },
  });

  await esClient.indices.putIndexTemplate({
    name: INDEX_TEMPLATE_NAME,
    index_patterns: [INDEX_PATTERN],
    composed_of: [COMPONENT_TEMPLATE_NAME],
    priority: 500,
    template: {
      settings: {
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
        hidden: true,
      },
    },
  });
}

async function createLocksWriteIndex(esClient: Client): Promise<void> {
  await esClient.indices.create({ index: LOCKS_CONCRETE_INDEX_NAME }, { ignore: [400] });
}
