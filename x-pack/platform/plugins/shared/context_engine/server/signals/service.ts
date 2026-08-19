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

/** Signals-store API using a global index with space isolation via `space_id` field. */
export interface SignalsServiceApi {
  ensureIndex(): Promise<void>;
  write(signals: Signal[]): Promise<void>;
}

/** Owns the global `ai-index-idx-signals` index. Append/overwrite only; no delete path. */
export class SignalsService implements SignalsServiceApi {
  private readonly client: SignalsStorageClient;

  constructor({ esClient, logger }: { esClient: ElasticsearchClient; logger: Logger }) {
    this.client = createSignalsStorageClient({ esClient, logger });
  }

  /** Reconciles the signals index mappings if it exists; the index is created lazily on first write. */
  async ensureIndex(): Promise<void> {
    await this.client.reconcileMappings();
  }

  /** Bulk-writes signals into the global index, keyed by `signal_id` so re-processing overwrites rather than duplicates. */
  async write(signals: Signal[]): Promise<void> {
    if (signals.length === 0) {
      return;
    }
    await this.client.bulk({
      operations: signals.map((signal) => ({
        index: { _id: signal.signal_id, document: signal },
      })),
      refresh: false,
      throwOnFail: true,
    });
  }
}
