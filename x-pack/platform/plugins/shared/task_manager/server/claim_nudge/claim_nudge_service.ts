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
import { MGET_DEFAULT_POLL_INTERVAL } from '../config';

const GLOBAL_CLAIM_NUDGE_ID = 'global';
// Never read back (only the checkpoint matters); mapped so the index is easy to inspect.
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
// Every nudge writes one document, so one shard. Serverless rejects these settings.
const CLAIM_NUDGE_SETTINGS: estypes.IndicesIndexSettings = {
  number_of_shards: 1,
  auto_expand_replicas: '0-1',
};
// Under 60s so idle proxies don't close the long-poll connection first.
export const CHECKPOINT_WAIT_TIMEOUT = '50s';
// Above CHECKPOINT_WAIT_TIMEOUT so the server times out first.
export const REQUEST_TIMEOUT_MS = 65_000;
const ERROR_RETRY_BASE_DELAY_MS = 1_000;
export const ERROR_RETRY_MAX_DELAY_MS = 60_000;
const ERROR_LOG_THROTTLE_MS = 60_000;
export const NUDGE_WRITE_TIMEOUT_MS = MGET_DEFAULT_POLL_INTERVAL;
export const NUDGE_CREATE_TIMEOUT_MS = 60_000;
export const MISSING_INDEX_RETRY_DELAY_MS = 1_000;

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

/** Sends and watches best-effort claim nudges via a signal index's global checkpoint. */
export class TaskManagerClaimNudgeService {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly index: string;
  private readonly isServerless: boolean;
  private readonly claimNudgeSubject = new Subject<void>();
  private started = false;
  private runController: AbortController | undefined;
  private requestController: AbortController | undefined;
  private baselineSet = false;
  private lastErrorLoggedAt = 0;
  private indexReady = false;
  private creationNotification: Promise<void> | undefined;
  private readonly outboundControllers = new Set<AbortController>();
  private stopped = false;
  private generation = 0;
  private consecutiveErrors = 0;

  constructor({ logger, esClient, index, isServerless }: TaskManagerClaimNudgeServiceOptions) {
    this.logger = logger;
    this.esClient = esClient;
    this.index = index;
    this.isServerless = isServerless;
  }

  /** Emits when any Kibana node, including this one, sends a nudge. */
  public get claimNudge$() {
    return this.claimNudgeSubject.asObservable();
  }

  /** Starts watching for nudges; a no-op while already started. */
  public start() {
    if (this.started) {
      return;
    }

    this.started = true;
    this.stopped = false;
    this.baselineSet = false;
    this.runController = new AbortController();
    const runSignal = this.runController.signal;
    // The loop retries internally; an escape here is unrecoverable, and must not crash Kibana.
    void this.watchCheckpoints(runSignal).catch((err) => {
      if (runSignal.aborted) {
        return;
      }
      this.started = false;
      this.logger.error(
        `Task Manager claim nudge watch loop for index ${this.index} stopped unexpectedly; ` +
          `falling back to regular polling until Kibana restarts: ${this.getErrorMessage(err)}`
      );
    });
  }

  /** Stops watching and sending, aborting in-flight requests. */
  public stop() {
    this.started = false;
    this.stopped = true;
    this.generation += 1;
    this.creationNotification = undefined;
    for (const controller of this.outboundControllers) {
      controller.abort();
    }
    this.runController?.abort();
    this.runController = undefined;
    this.requestController?.abort();
    this.requestController = undefined;
  }

  /** Sends a nudge, creating the signal index first if needed. Never rejects on create failure. */
  public notify(): Promise<void> {
    // Not `started`: UI-only nodes send without ever watching.
    if (this.stopped) {
      return Promise.resolve();
    }
    if (this.indexReady) {
      return this.writeSignal();
    }
    if (!this.creationNotification) {
      const generation = this.generation;
      const notification = this.createIndex()
        .then(async () => {
          if (this.stopped || generation !== this.generation) {
            return;
          }
          // Later callers write separately so their updates precede a checkpoint advance.
          this.indexReady = true;
          await this.writeSignal();
        })
        .catch((err) => {
          if (this.stopped || generation !== this.generation) {
            return;
          }
          // Logged once here rather than by every caller sharing this attempt.
          this.logger.warn(
            `Could not confirm the Task Manager claim nudge for index ${
              this.index
            }; the next poll cycle will claim the task: ${this.getErrorMessage(err)}`
          );
        })
        .finally(() => {
          if (this.creationNotification === notification) {
            this.creationNotification = undefined;
          }
        });
      this.creationNotification = notification;
    }
    return this.creationNotification;
  }

  private async writeSignal() {
    const document: ClaimNudgeSignal = {
      updated_at: new Date().toISOString(),
      nonce: v4(),
    };
    // No refresh: the checkpoint advances on write, not on searchability.
    await this.withRequest((signal) =>
      this.esClient.index<ClaimNudgeSignal>(
        { index: this.index, id: GLOBAL_CLAIM_NUDGE_ID, document },
        { signal, requestTimeout: NUDGE_WRITE_TIMEOUT_MS, maxRetries: 0 }
      )
    );
  }

  private async withRequest<T>(request: (signal: AbortSignal) => Promise<T>): Promise<T> {
    // Per request: the client aborts the given signal on its own request timeout.
    const controller = new AbortController();
    this.outboundControllers.add(controller);
    try {
      return await request(controller.signal);
    } finally {
      this.outboundControllers.delete(controller);
    }
  }

  private async createIndex() {
    try {
      await this.withRequest((signal) =>
        this.esClient.indices.create(
          {
            index: this.index,
            mappings: CLAIM_NUDGE_MAPPINGS,
            ...(this.isServerless ? {} : { settings: CLAIM_NUDGE_SETTINGS }),
          },
          { signal, requestTimeout: NUDGE_CREATE_TIMEOUT_MS, maxRetries: 0 }
        )
      );
    } catch (err) {
      // Expected when another node created it first.
      if (err?.body?.error?.type !== 'resource_already_exists_exception') {
        throw err;
      }
    }
  }

  /** `runSignal` is aborted by `stop()`, so an abandoned loop cannot resume after a restart. */
  private async watchCheckpoints(runSignal: AbortSignal) {
    let checkpoints: estypes.FleetCheckpoint[] = [];

    while (this.started && !runSignal.aborted) {
      // Not `runSignal`: the client aborts the given signal on its own request timeout.
      const requestController = new AbortController();
      this.requestController = requestController;

      try {
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
              signal: requestController.signal,
              requestTimeout: REQUEST_TIMEOUT_MS,
              retryOnTimeout: false,
              // Retries go through the jittered backoff below.
              maxRetries: 0,
            }
          );

        if (!this.started || runSignal.aborted) {
          return;
        }

        this.consecutiveErrors = 0;

        // The first response is only a baseline; a nudge racing it falls back to polling.
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
        if (!this.started || runSignal.aborted) {
          this.logger.debug(`Task Manager claim nudge watch loop for index ${this.index} stopped.`);
          return;
        }

        if (err?.body?.error?.type === 'index_not_found_exception') {
          // `wait_for_index` timed out before any node sent a nudge.
          this.logger.debug(
            `Task Manager claim nudge index ${this.index} does not exist yet; retrying in ${MISSING_INDEX_RETRY_DELAY_MS}ms`
          );
          this.consecutiveErrors = 0;
          this.baselineSet = false;
          checkpoints = [];
          await this.delay(MISSING_INDEX_RETRY_DELAY_MS, runSignal);
          continue;
        }

        this.consecutiveErrors += 1;
        const retryDelayMs = this.calculateRetryDelayMs();
        this.logThrottledWarning(err, retryDelayMs);
        await this.delay(retryDelayMs, runSignal);
      } finally {
        // Don't clear a newer loop's controller.
        if (this.requestController === requestController) {
          this.requestController = undefined;
        }
      }
    }
  }

  /** Exponential backoff with equal jitter. */
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

  /** Resolves after `ms`, or early on abort. */
  private delay(ms: number, signal: AbortSignal) {
    return new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }

      const finish = () => {
        clearTimeout(timeout);
        signal.removeEventListener('abort', finish);
        resolve();
      };
      const timeout = setTimeout(finish, ms);
      signal.addEventListener('abort', finish, { once: true });
    });
  }
}
