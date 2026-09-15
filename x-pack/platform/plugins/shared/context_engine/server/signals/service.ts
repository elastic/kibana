/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Signal } from '../../common/http_api/signals';
import type { SignalsStorageClient } from './storage';
import { createSignalsStorageClient } from './storage';

/** Signals-store API. Every call is scoped to a Kibana space, which maps to a per-space index. */
export interface SignalsServiceApi {
  ensureIndex(spaceId: string): Promise<void>;
  write(spaceId: string, signals: Signal[]): Promise<void>;
}

/** Owns the per-space `context-engine-signals-<space>` indices. Append/overwrite only; no delete path. */
export class SignalsService implements SignalsServiceApi {
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;
  private readonly clientsBySpace = new Map<string, SignalsStorageClient>();

  constructor({ esClient, logger }: { esClient: ElasticsearchClient; logger: Logger }) {
    this.esClient = esClient;
    this.logger = logger;
  }

  private clientFor(spaceId: string): SignalsStorageClient {
    let client = this.clientsBySpace.get(spaceId);
    if (!client) {
      client = createSignalsStorageClient({
        esClient: this.esClient,
        logger: this.logger,
        spaceId,
      });
      this.clientsBySpace.set(spaceId, client);
    }
    return client;
  }

  /** Reconciles the space's signals index mappings if it exists; the index is created lazily on first write. */
  async ensureIndex(spaceId: string): Promise<void> {
    await this.clientFor(spaceId).reconcileMappings();
  }

  /** Bulk-writes signals into the space's index, keyed by `signal_id` so re-processing overwrites rather than duplicates. */
  async write(spaceId: string, signals: Signal[]): Promise<void> {
    if (signals.length === 0) {
      return;
    }
    await this.clientFor(spaceId).bulk({
      operations: signals.map((signal) => ({
        index: { _id: signal.signal_id, document: signal },
      })),
      refresh: false,
      throwOnFail: true,
    });
  }
}
