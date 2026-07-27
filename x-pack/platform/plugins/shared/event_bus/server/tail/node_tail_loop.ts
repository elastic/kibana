/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BROADCAST_TARGET } from '../types';
import type { SubscriptionRegistry } from '../subscription_registry';
import type { EsNames } from '../es/names';
import { cursorFromNow, type Cursor } from './cursor';
import { readBatch } from './tail_reader';

export interface NodeTailLoopDeps {
  esClient: ElasticsearchClient;
  names: EsNames;
  nodeId: string;
  registry: SubscriptionRegistry;
  logger: Logger;
  pollIntervalMs: number;
  safetyLagMs: number;
  batchSize: number;
}

/**
 * The single ephemeral tail loop per node (M1 single-node, M2 broadcast vs
 * directed). One shared `search_after` loop reads the union of all local
 * ephemeral subscribers' types filtered to `target ∈ {all, thisNodeId}`, then
 * dispatches each event to the matching handlers. In-memory cursor starting at
 * "now" → at-most-once across restart.
 */
export class NodeTailLoop {
  private running = false;
  private cursor: Cursor | null = null;
  private controller = new AbortController();
  private sleepTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly deps: NodeTailLoopDeps) {}

  public start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.cursor = cursorFromNow();
    this.controller = new AbortController();
    void this.loop();
  }

  public stop(): void {
    this.running = false;
    this.controller.abort();
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
    }
  }

  private buildFilter(): estypes.QueryDslQueryContainer[] {
    return [
      { terms: { target: [BROADCAST_TARGET, this.deps.nodeId] } },
      { terms: { 'event.type': this.deps.registry.ephemeralTypes() } },
    ];
  }

  private async loop(): Promise<void> {
    const { esClient, names, registry, logger, pollIntervalMs, safetyLagMs, batchSize } = this.deps;

    while (this.running) {
      try {
        if (!registry.hasEphemeral()) {
          await this.sleep(pollIntervalMs);
          continue;
        }

        const { events, nextCursor, hasMore } = await readBatch({
          esClient,
          index: names.dataStream,
          filter: this.buildFilter(),
          cursor: this.cursor,
          startTs: this.cursor ? this.cursor[0] : Date.now(),
          safetyLagMs,
          batchSize,
          signal: this.controller.signal,
        });

        for (const event of events) {
          await registry.dispatchEphemeral(event, logger);
        }
        // Advance regardless of individual handler outcomes (at-most-once).
        this.cursor = nextCursor;

        if (!hasMore) {
          await this.sleep(pollIntervalMs);
        }
      } catch (err) {
        if (this.running) {
          logger.error(`event bus node tail loop error: ${err.message}`);
          await this.sleep(pollIntervalMs);
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.sleepTimer = setTimeout(resolve, ms);
    });
  }
}
