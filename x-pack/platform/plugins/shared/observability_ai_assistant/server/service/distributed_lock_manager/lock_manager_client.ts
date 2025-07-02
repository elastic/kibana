/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import { errors } from '@elastic/elasticsearch';
import { Logger } from '@kbn/logging';
import { v4 as uuid } from 'uuid';
import pRetry from 'p-retry';
import prettyMilliseconds from 'pretty-ms';
import { once } from 'lodash';
import { duration } from 'moment';
import { ElasticsearchClient } from '@kbn/core/server';

export const LOCKS_INDEX_ALIAS = '.kibana_locks';
export const LOCKS_CONCRETE_INDEX_NAME = `${LOCKS_INDEX_ALIAS}-000001`;

export type LockId = string;
export interface LockDocument {
  createdAt: string;
  expiresAt: string;
  metadata: Record<string, any>;
  token: string;
}

export interface AcquireOptions {
  /**
   * Metadata to be stored with the lock. This can be any key-value pair.
   * This is not mapped and therefore not searchable.
   */
  metadata?: Record<string, any>;
  /**
   * Time to live (TTL) for the lock in milliseconds. Default is 5 minutes.
   * When a lock expires it can be acquired by another process
   */
  ttl?: number;
}

const createLocksWriteIndexOnce = once(createLocksWriteIndex);

export class LockManager {
  private token = uuid();

  constructor(
    private lockId: LockId,
    private esClient: ElasticsearchClient,
    private logger: Logger
  ) {}

  /**
   * Attempts to acquire a lock by creating a document with the given lockId.
   * If the lock exists and is expired, it will be released and acquisition retried.
   */
  public async acquire({
    metadata = {},
    ttl = duration(5, 'minutes').asMilliseconds(),
  }: AcquireOptions = {}): Promise<boolean> {
    await createLocksWriteIndexOnce(this.esClient);
    this.token = uuid();
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
                def instantNow = Instant.ofEpochMilli(now);
                ctx._source.createdAt = instantNow.toString();
                ctx._source.expiresAt = instantNow.plusMillis(params.ttl).toString();
              } else {
                ctx.op = 'noop'
              }
            `,
          params: {
            ttl,
          },
        },
        // @ts-expect-error
        upsert: {
          metadata,
          token: this.token,
        },
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
      if (isVersionConflictException(e)) {
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
      const response = await this.esClient.update<LockDocument>({
        index: LOCKS_CONCRETE_INDEX_NAME,
        id: this.lockId,
        scripted_upsert: false,
        script: {
          lang: 'painless',
          source: `
            if (ctx._source.token == params.token) {
              ctx.op = 'delete';
            } else {
              ctx.op = 'noop';
            }
          `,
          params: { token: this.token },
        },
        refresh: true,
      });

      if (response.result === 'deleted') {
        this.logger.debug(`Lock "${this.lockId}" released with token ${this.token}.`);
        return true;
      } else if (response.result === 'noop') {
        this.logger.debug(
          `Lock "${this.lockId}" was not released. Token ${this.token} does not match.`
        );
        return false;
      } else {
        throw new Error(`Unexpected response: ${response.result}`);
      }
    } catch (error: any) {
      if (
        error instanceof errors.ResponseError &&
        error.body?.error?.type === 'document_missing_exception'
      ) {
        this.logger.debug(`Lock "${this.lockId}" already released.`);
        return false;
      }

      this.logger.error(`Failed to release lock "${this.lockId}": ${error.message}`);
      this.logger.debug(error);
      return false;
    }
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
    return hits[0]?._source;
  }

  public async acquireWithRetry({
    metadata,
    ttl,
    ...retryOptions
  }: AcquireOptions & pRetry.Options = {}): Promise<boolean> {
    return pRetry(async () => {
      const acquired = await this.acquire({ metadata, ttl });
      if (!acquired) {
        this.logger.debug(`Lock "${this.lockId}" not available yet.`);
        throw new Error(`Lock "${this.lockId}" not available yet`);
      }
      return acquired;
    }, retryOptions ?? { forever: true, maxTimeout: 10_000 });
  }

  public async extendTtl(ttl = 300000): Promise<boolean> {
    try {
      await this.esClient.update<LockDocument>({
        index: LOCKS_CONCRETE_INDEX_NAME,
        id: this.lockId,
        script: {
          lang: 'painless',
          source: `
          if (ctx._source.token == params.token) {
            long now = System.currentTimeMillis();
            ctx._source.expiresAt = Instant.ofEpochMilli(now + params.ttl).toString();
          } else {
            ctx.op = 'noop';
          }`,
          params: {
            ttl,
            token: this.token,
          },
        },
        refresh: true,
      });
      this.logger.debug(`Lock "${this.lockId}" extended ttl with ${prettyMilliseconds(ttl)}.`);
      return true;
    } catch (error) {
      if (isVersionConflictException(error)) {
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
    esClient,
    logger,
    lockId,
    metadata,
    ttl = duration(5, 'minutes').asMilliseconds(),
    waitForLock = false,
    retryOptions,
  }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    lockId: LockId;
    waitForLock?: boolean;
    retryOptions?: pRetry.Options;
  } & AcquireOptions,
  callback: () => Promise<T>
): Promise<T | undefined> {
  const lockManager = new LockManager(lockId, esClient, logger);
  const acquired =
    waitForLock ?? retryOptions
      ? await lockManager.acquireWithRetry({ metadata, ttl, ...retryOptions })
      : await lockManager.acquire({ metadata, ttl });

  if (!acquired) {
    logger.debug(`Lock "${lockId}" not acquired. Exiting.`);
    throw new LockAcquisitionError(`Lock "${lockId}" not acquired`);
  }

  // extend the ttl periodically
  const extendInterval = Math.floor(ttl / 2);
  logger.debug(
    `Lock "${lockId}" acquired. Extending TTL every ${prettyMilliseconds(extendInterval)}`
  );

  let extendTTlPromise = Promise.resolve(true);
  const intervalId = setInterval(() => {
    // wait for the previous extendTtl request to finish before sending the next one. This is to avoid flooding ES with extendTtl requests in cases where ES is slow to respond.
    extendTTlPromise = extendTTlPromise
      .then(() => lockManager.extendTtl())
      .catch((err) => {
        logger.error(`Failed to extend lock "${lockId}":`, err);
        return false;
      });
  }, extendInterval);

  try {
    return await callback();
  } finally {
    try {
      clearInterval(intervalId);
      await extendTTlPromise;
      await lockManager.release();
    } catch (error) {
      logger.error(`Failed to release lock "${lockId}" in withLock: ${error.message}`);
    }
  }
}

export async function ensureTemplatesAndIndexCreated(esClient: ElasticsearchClient): Promise<void> {
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

async function createLocksWriteIndex(esClient: ElasticsearchClient): Promise<void> {
  await esClient.indices.create({ index: LOCKS_CONCRETE_INDEX_NAME }, { ignore: [400] });
}

function isVersionConflictException(e: Error): boolean {
  return (
    e instanceof errors.ResponseError && e.body?.error?.type === 'version_conflict_engine_exception'
  );
}

export class LockAcquisitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LockAcquisitionError';
  }
}
