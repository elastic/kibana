/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { Subject } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

const GLOBAL_CLAIM_NUDGE_ID = 'global';
// The global checkpoint Elasticsearch reports for an index that has never been written to.
const NEW_INDEX_CHECKPOINT = -1;
// The signal document is never read back — only the index's global checkpoint matters — but the
// fields are mapped anyway so the index is self-describing and easy to inspect when debugging.
const CLAIM_NUDGE_MAPPINGS: estypes.MappingTypeMapping = {
  dynamic: false,
  properties: {
    updated_at: {
      type: 'date',
    },
    nonce: {
      type: 'keyword',
      ignore_above: 1024,
    },
  },
};
// Mirrors the settings Core applies to saved object indices: a single shard keeps the checkpoint
// array to one entry, and auto-expanding replicas keeps the index green on single-node clusters.
// Serverless Elasticsearch manages shards and replicas itself and rejects these settings.
const CLAIM_NUDGE_SETTINGS: estypes.IndicesIndexSettings = {
  number_of_shards: 1,
  auto_expand_replicas: '0-1',
};
// How long the ES `_fleet/global_checkpoints` request should long-poll for before
// returning with `timed_out: true`. We simply re-issue the request in a loop.
const CHECKPOINT_WAIT_TIMEOUT = '30s';
// The ES client's default `requestTimeout` (30s) races the `CHECKPOINT_WAIT_TIMEOUT` above,
// causing spurious client-side timeouts. Give the request extra headroom.
const REQUEST_TIMEOUT_MS = 45_000;
const ERROR_RETRY_DELAY_MS = 1_000;
// Avoid flooding the logs with a warning on every failed long-poll iteration.
const ERROR_LOG_THROTTLE_MS = 60_000;

/**
 * Long-polls a dedicated, low-volume Elasticsearch index via the Fleet
 * `_fleet/global_checkpoints?wait_for_advance` API so Task Manager is notified almost
 * immediately when a `runSoon` (or `schedule(..., { requestImmediateClaim: true })`) happens
 * on another Kibana node, instead of waiting for the next poll interval.
 *
 * Best-effort: if the long-poll fails or is disabled, regular polling still picks up tasks;
 * this only nudges an existing poll cycle to run sooner.
 */
export interface TaskManagerClaimNudgeServiceOptions {
  logger: Logger;
  esClient: ElasticsearchClient;
  index: string;
  isServerless: boolean;
}

interface ClaimNudgeSignal {
  updated_at: string;
  nonce: string;
}

export class TaskManagerClaimNudgeService {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly index: string;
  private readonly isServerless: boolean;
  private readonly claimNudgeSubject = new Subject<void>();
  private started = false;
  private abortController: AbortController | undefined;
  private baselineSet = false;
  private lastErrorLoggedAt = 0;
  private ensureIndexPromise: Promise<void> | undefined;
  private createdIndex = false;

  constructor({ logger, esClient, index, isServerless }: TaskManagerClaimNudgeServiceOptions) {
    this.logger = logger;
    this.esClient = esClient;
    this.index = index;
    this.isServerless = isServerless;
  }

  /**
   * Emits whenever the claim nudge signal index advances, meaning some Kibana node
   * (possibly this one) requested an immediate claim cycle.
   */
  public get claimNudge$() {
    return this.claimNudgeSubject.asObservable();
  }

  /**
   * Begin long-polling the claim nudge signal index. Safe to call multiple times; only the
   * first call while stopped has an effect.
   */
  public start() {
    if (this.started) {
      return;
    }

    this.started = true;
    this.baselineSet = false;
    void this.watchCheckpoints();
  }

  /**
   * Stop long-polling and abort any in-flight request.
   */
  public stop() {
    this.started = false;
    this.abortController?.abort();
    this.abortController = undefined;
  }

  /**
   * Write a new signal document, advancing the claim nudge index's global checkpoint so that
   * any node currently long-polling immediately observes the advance and triggers a claim cycle.
   */
  public async notify() {
    await this.ensureIndexExists();

    const document: ClaimNudgeSignal = {
      updated_at: new Date().toISOString(),
      nonce: v4(),
    };

    // A single document, overwritten in place: its contents are irrelevant, the write itself is
    // the signal. `nonce` guarantees every call is a real change rather than a no-op.
    await this.esClient.index<ClaimNudgeSignal>({
      index: this.index,
      id: GLOBAL_CLAIM_NUDGE_ID,
      document,
      refresh: true,
    });
  }

  /**
   * Creates the signal index if it doesn't already exist. Unlike a saved object index, nothing
   * creates this index during startup migrations, so both the notifying and the watching side
   * have to be able to bring it into existence. Memoized so a healthy node only pays for it once.
   */
  private async ensureIndexExists() {
    if (!this.ensureIndexPromise) {
      this.ensureIndexPromise = this.createIndex().catch((err) => {
        // Allow a later call to retry rather than caching the failure for the process lifetime.
        this.ensureIndexPromise = undefined;
        throw err;
      });
    }

    return this.ensureIndexPromise;
  }

  private async createIndex() {
    try {
      await this.esClient.indices.create({
        index: this.index,
        mappings: CLAIM_NUDGE_MAPPINGS,
        ...(this.isServerless ? {} : { settings: CLAIM_NUDGE_SETTINGS }),
      });
      this.createdIndex = true;
    } catch (err) {
      // Every Kibana node races to create the index; losing that race is the expected outcome.
      if (err?.body?.error?.type !== 'resource_already_exists_exception') {
        throw err;
      }
    }
  }

  private async watchCheckpoints() {
    let checkpoints: estypes.FleetCheckpoint[] = [];

    while (this.started) {
      this.abortController = new AbortController();

      try {
        await this.ensureIndexExists();

        if (this.createdIndex && !this.baselineSet) {
          // We created the index, so its checkpoint is known and there is no need to spend a round
          // trip discovering it. That round trip would otherwise absorb a nudge written while we
          // were still arming, silently dropping it.
          checkpoints = [NEW_INDEX_CHECKPOINT];
          this.baselineSet = true;
        }

        const { global_checkpoints: nextCheckpoints, timed_out: timedOut } =
          await this.esClient.fleet.globalCheckpoints(
            {
              index: this.index,
              wait_for_advance: true,
              wait_for_index: true,
              checkpoints,
              timeout: CHECKPOINT_WAIT_TIMEOUT,
            },
            {
              signal: this.abortController.signal,
              requestTimeout: REQUEST_TIMEOUT_MS,
              retryOnTimeout: false,
            }
          );

        const hasAdvanced =
          this.baselineSet &&
          !timedOut &&
          JSON.stringify(checkpoints) !== JSON.stringify(nextCheckpoints);

        checkpoints = nextCheckpoints;
        this.baselineSet = true;

        if (hasAdvanced) {
          this.claimNudgeSubject.next();
        }
      } catch (err) {
        if (!this.started || this.isAbortError(err)) {
          return;
        }

        this.logThrottledWarning(err);
        await this.delay(ERROR_RETRY_DELAY_MS);
      } finally {
        this.abortController = undefined;
      }
    }
  }

  private logThrottledWarning(err: unknown) {
    const now = Date.now();
    if (now - this.lastErrorLoggedAt < ERROR_LOG_THROTTLE_MS) {
      return;
    }
    this.lastErrorLoggedAt = now;
    this.logger.warn(
      `Failed to watch Task Manager claim nudge checkpoints for index ${
        this.index
      }, falling back to regular polling: ${this.getErrorMessage(err)}`
    );
  }

  private isAbortError(err: unknown): boolean {
    if (err instanceof Error) {
      return (
        err.name === 'AbortError' ||
        err.name === 'RequestAbortedError' ||
        err.message.includes('aborted')
      );
    }
    return false;
  }

  private getErrorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  private delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
