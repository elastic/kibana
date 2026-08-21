/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { random } from 'lodash';
import { v4 } from 'uuid';
import { Subject } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

const GLOBAL_CLAIM_NUDGE_ID = 'global';
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
// Mirrors Core's saved-object index settings: one shard keeps the checkpoint array to one entry;
// auto-expanding replicas keeps single-node clusters green. Serverless rejects these settings.
const CLAIM_NUDGE_SETTINGS: estypes.IndicesIndexSettings = {
  number_of_shards: 1,
  auto_expand_replicas: '0-1',
};
// Long-poll timeout for `_fleet/global_checkpoints`. Kept under 60s so idle proxies/load
// balancers (which see no bytes while the request waits) don't close the connection first.
const CHECKPOINT_WAIT_TIMEOUT = '50s';
// Headroom above CHECKPOINT_WAIT_TIMEOUT so the client doesn't time out before the server does.
const REQUEST_TIMEOUT_MS = 65_000;
// Base and cap for the exponential backoff computed in calculateRetryDelayMs(); the failure
// count resets on any resolved response, including a timeout.
const ERROR_RETRY_BASE_DELAY_MS = 1_000;
const ERROR_RETRY_MAX_DELAY_MS = 60_000;
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
  private consecutiveErrors = 0;

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
   * Writes a new signal document, advancing the claim nudge index's global checkpoint so any
   * node currently long-polling immediately observes it and triggers a claim cycle.
   *
   * No `refresh`: the checkpoint advances once the write replicates, which has nothing to do
   * with searchability — a refresh would only add cost and latency for no benefit here.
   */
  public async notify() {
    await this.ensureIndexExists();

    const document: ClaimNudgeSignal = {
      updated_at: new Date().toISOString(),
      nonce: v4(),
    };

    // Contents don't matter; the write itself is the signal. `nonce` ensures each call is a
    // real change rather than a no-op.
    await this.esClient.index<ClaimNudgeSignal>({
      index: this.index,
      id: GLOBAL_CLAIM_NUDGE_ID,
      document,
    });
  }

  /**
   * Creates the signal index if needed (nothing else does, unlike saved-object indices). Only
   * `notify()` calls this — the watch loop relies on `wait_for_index: true` instead. Memoized
   * so a healthy node only pays for it once.
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
        // wait_for_index lets this watch an index that doesn't exist yet (see ensureIndexExists).
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

        // Any resolved response — even a timeout — counts as a success for backoff purposes.
        this.consecutiveErrors = 0;

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
        if (!this.started) {
          // Expected: `stop()` set `started` to false before aborting the in-flight request.
          this.logger.debug(`Task Manager claim nudge watch loop for index ${this.index} stopped.`);
          return;
        }

        this.consecutiveErrors += 1;
        const retryDelayMs = this.calculateRetryDelayMs();
        this.logThrottledWarning(err, retryDelayMs);
        await this.delay(retryDelayMs);
      } finally {
        this.abortController = undefined;
      }
    }
  }

  /**
   * Equal jitter: half the exponential backoff is guaranteed, the other half is randomized.
   * Keeps nodes from retrying in lockstep without letting the delay collapse near zero.
   */
  private calculateRetryDelayMs() {
    const half =
      Math.min(
        ERROR_RETRY_MAX_DELAY_MS,
        ERROR_RETRY_BASE_DELAY_MS * 2 ** (this.consecutiveErrors - 1)
      ) / 2;
    return half + random(half);
  }

  private logThrottledWarning(err: unknown, retryDelayMs: number) {
    const now = Date.now();
    if (now - this.lastErrorLoggedAt < ERROR_LOG_THROTTLE_MS) {
      return;
    }
    this.lastErrorLoggedAt = now;
    this.logger.warn(
      `Failed to watch Task Manager claim nudge checkpoints for index ${
        this.index
      }, falling back to regular polling and retrying in ~${retryDelayMs}ms: ${this.getErrorMessage(
        err
      )}`
    );
  }

  private getErrorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  private delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
