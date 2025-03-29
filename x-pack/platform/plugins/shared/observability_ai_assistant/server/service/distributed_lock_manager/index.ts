/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, errors } from '@elastic/elasticsearch';
import { Logger } from '@kbn/logging';

const INDEX_NAME = '.kibana-distributed-lock-manager';

export enum LockId {
  KnowledgeBaseReindex = 'knowledge_base_reindex',
}

export interface LockDocument {
  createdAt: string;
  expiresAt: string;
  meta: Record<string, any>;
}

export class LockManager {
  constructor(private lockId: LockId, private esClient: Client, private logger: Logger) {}

  /**
   * Attempts to acquire a lock by creating a document with the given lockId.
   * If the lock exists and is expired, it will be released and acquisition retried.
   */
  public async acquire(
    options: { meta?: Record<string, any>; ttlMs?: number } = {}
  ): Promise<boolean> {
    const ttl = options.ttlMs ?? 3600 * 1000; // Default TTL: 1 hour.
    const now = new Date();

    try {
      await this.esClient.index({
        index: INDEX_NAME,
        id: this.lockId,
        body: {
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + ttl).toISOString(),
          meta: options.meta ?? {},
        },
        op_type: 'create', // Only create if the document does not already exist.
      });
      this.logger.debug(`Lock "${this.lockId}" acquired.`);
      return true;
    } catch (error: unknown) {
      const isVersionConflictError =
        error instanceof errors.ResponseError &&
        error.body?.error?.type === 'version_conflict_engine_exception';

      if (isVersionConflictError) {
        const existingLock = await this.get();
        if (!existingLock) {
          // If the lock doesn't exist, it might have been purged because it expired and we will try acquiring it again.
          return this.acquire(options);
        }
        return false;
      }

      throw error;
    }
  }

  private isExpired(lock: LockDocument): boolean {
    const { expiresAt } = lock;
    return new Date(expiresAt) < new Date();
  }

  /**
   * Releases a lock by deleting its document.
   * If the document is not found, the error is ignored.
   */
  public async release(): Promise<void> {
    await this.esClient.delete({ index: INDEX_NAME, id: this.lockId }, { ignore: [404] });
    this.logger.debug(`Lock "${this.lockId}" released.`);
  }

  /**
   * Retrieves the lock document for a given lockId.
   * If the lock is expired, it will be released.
   */
  public async get(): Promise<LockDocument | undefined> {
    const res = await this.esClient.get<LockDocument>(
      { index: INDEX_NAME, id: this.lockId },
      { ignore: [404] }
    );

    if (!res?._source) {
      return;
    }

    // Check if the lock is expired.
    if (this.isExpired(res?._source)) {
      await this.release();
      return;
    }

    return res._source;
  }
}

export async function ensureTemplatesAndIndexCreated(client: Client): Promise<void> {
  const COMPONENT_TEMPLATE_NAME = `${INDEX_NAME}-component`;
  const INDEX_TEMPLATE_NAME = `${INDEX_NAME}-index-template`;

  await client.cluster.putComponentTemplate({
    name: COMPONENT_TEMPLATE_NAME,
    template: {
      mappings: {
        dynamic: false,
        properties: {
          meta: { enabled: false },
          createdAt: { type: 'date' },
          expiresAt: { type: 'date' },
        },
      },
    },
  });

  await client.indices.putIndexTemplate({
    name: INDEX_TEMPLATE_NAME,
    index_patterns: [INDEX_NAME],
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

  await client.indices.create({ index: INDEX_NAME }, { ignore: [400] });
}
