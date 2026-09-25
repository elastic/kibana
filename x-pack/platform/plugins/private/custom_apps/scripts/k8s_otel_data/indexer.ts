/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { BulkDoc } from './docs';

export interface IndexerStats {
  indexed: number;
  /** Documents already present from an earlier run with the same seed and grid. */
  skipped: number;
  failed: number;
}

export interface IndexerOptions {
  batchSize: number;
  concurrency: number;
  log: ToolingLog;
}

/**
 * Buffers documents and flushes them as bulk requests, keeping a bounded number in
 * flight. Generation streams interval by interval, so peak memory stays at roughly
 * one interval's worth of documents no matter how long the lookback is.
 */
export class Indexer {
  public readonly stats: IndexerStats = { indexed: 0, skipped: 0, failed: 0 };

  private buffer: BulkDoc[] = [];
  private inFlight = new Set<Promise<void>>();
  private firstError: string | undefined;

  constructor(private readonly client: Client, private readonly options: IndexerOptions) {}

  add(doc: BulkDoc): void {
    this.buffer.push(doc);
  }

  /** Sends whatever is buffered once it is worth a round trip. */
  async maybeFlush(): Promise<void> {
    if (this.buffer.length >= this.options.batchSize) await this.flush();
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer;
    this.buffer = [];

    while (this.inFlight.size >= this.options.concurrency) {
      await Promise.race(this.inFlight);
    }

    const request = this.send(batch);
    this.inFlight.add(request);
    void request.finally(() => this.inFlight.delete(request));
  }

  async drain(): Promise<void> {
    await this.flush();
    await Promise.all(this.inFlight);
    if (this.firstError) {
      this.options.log.warning(`First indexing error: ${this.firstError}`);
    }
  }

  private async send(batch: BulkDoc[]): Promise<void> {
    const operations: object[] = [];
    for (const { index, doc, id, op, dynamicTemplates } of batch) {
      const action = {
        _index: index,
        ...(id ? { _id: id } : {}),
        ...(dynamicTemplates ? { dynamic_templates: dynamicTemplates } : {}),
      };
      operations.push(op === 'index' ? { index: action } : { create: action });
      operations.push(doc);
    }

    const response = await this.client.bulk({ operations, refresh: false });
    if (!response.errors) {
      this.stats.indexed += batch.length;
      return;
    }

    for (const item of response.items) {
      const result = item.create ?? item.index;
      if (!result?.error) {
        this.stats.indexed++;
      } else if (result.error.type === 'version_conflict_engine_exception') {
        // Same seed, same interval grid: the document is already there. Not an error.
        this.stats.skipped++;
      } else {
        this.stats.failed++;
        this.firstError ??= `${result.error.type}: ${result.error.reason}`;
      }
    }
  }
}
