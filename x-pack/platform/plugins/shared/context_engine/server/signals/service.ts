/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Signal, SignalType } from '../../common/http_api/signals';
import type { SignalsStorageClient } from './storage';
import { createSignalsStorageClient } from './storage';

/** Options narrowing which signals {@link SignalsService.list} returns. */
export interface ListSignalsOptions {
  signalType?: SignalType;
  size?: number;
}

/**
 * The signals-store surface exposed to consumers (producer task, UI, agent —
 * #15591+). Every call is scoped to a Kibana `spaceId`: signals live in a
 * per-space index (`context-engine-signals-<space>`), mirroring the per-space
 * traces convention, so spaces are physically isolated.
 */
export interface SignalsServiceApi {
  ensureIndex(spaceId: string): Promise<void>;
  write(spaceId: string, signals: Signal[]): Promise<void>;
  list(spaceId: string, options?: ListSignalsOptions): Promise<Signal[]>;
}

const DEFAULT_LIST_SIZE = 1000;
/** Hard cap on how many signals a single `list` call returns (defensive). */
const MAX_LIST_SIZE = 10_000;

/**
 * Owns the per-space `context-engine-signals-<space>` user indices: writes
 * signals produced by the signal-generation task (#15591) and reads them for
 * the UI / agent. There is no delete path — signals are append/overwrite only.
 */
export class SignalsService implements SignalsServiceApi {
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;
  // One storage client per space; the adapter is bound to a single index name.
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

  /**
   * Reconciles the mappings of the space's signals index when it already exists
   * (a no-op on a fresh cluster). The index is created lazily on the first
   * {@link SignalsService.write}; call this to pick up mapping changes once the
   * index exists, not to bootstrap it. Cheap to skip — `write` reconciles too.
   */
  async ensureIndex(spaceId: string): Promise<void> {
    await this.clientFor(spaceId).reconcileMappings();
  }

  /**
   * Bulk-writes signals into the space's index, keyed by `signal_id` so
   * re-processing a source overwrites rather than duplicates. `throwOnFail`
   * propagates a partial bulk failure so the producing task retries instead of
   * silently losing signals; `refresh: false` keeps this background analytics
   * write off the refresh path (read-your-write is not required).
   *
   * NOTE: overwrite idempotency relies on a single backing index per space —
   * `_id` uniqueness is per-index. If retention is ever added via ILM rollover,
   * switch reprocessing to update-by-`_index` (see #15590 / the sliding-window
   * follow-up), or duplicate `signal_id`s appear across backing indices.
   */
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

  /**
   * A bounded convenience read of a space's signals, newest first, optionally
   * narrowed by `signal_type`. Rich querying (filtering on `data.*`, grouping by
   * `tags`, time ranges, pagination) is delegated to consumers running ES|QL
   * directly against the space's index. Consumers own `signal_type` narrowing of
   * the returned union — `data` is not validated on read (trusts the mapping).
   */
  async list(
    spaceId: string,
    { signalType, size = DEFAULT_LIST_SIZE }: ListSignalsOptions = {}
  ): Promise<Signal[]> {
    const filters: estypes.QueryDslQueryContainer[] = [];
    if (signalType) {
      filters.push({ term: { signal_type: signalType } });
    }

    const response = await this.clientFor(spaceId).search({
      size: Math.max(1, Math.min(size, MAX_LIST_SIZE)),
      track_total_hits: false,
      sort: [{ '@timestamp': { order: 'desc' } }],
      ...(filters.length ? { query: { bool: { filter: filters } } } : {}),
    });

    return response.hits.hits.flatMap((hit) => (hit._source ? [hit._source as Signal] : []));
  }
}
