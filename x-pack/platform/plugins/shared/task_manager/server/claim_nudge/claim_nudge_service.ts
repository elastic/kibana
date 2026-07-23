/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { Subject } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { TASK_MANAGER_CLAIM_NUDGE_SO_NAME } from '../saved_objects';
import type { TaskManagerClaimNudge } from '../saved_objects/schemas/task_manager_claim_nudge';

const GLOBAL_CLAIM_NUDGE_ID = 'global';
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
 * `_fleet/global_checkpoints?wait_for_advance` API so that Task Manager can be notified
 * almost immediately when a `runSoon` (or a `schedule(..., { requestImmediateClaim: true })`)
 * call happens on another Kibana node, instead of waiting for the next poll interval.
 *
 * This is progressive enhancement: if the long-poll fails (or is disabled), Task Manager's
 * regular polling continues to pick up tasks unaffected. This service is never the primary
 * mechanism by which tasks are claimed, only a way to nudge an existing poll cycle to run sooner.
 */
export interface TaskManagerClaimNudgeServiceOptions {
  logger: Logger;
  esClient: ElasticsearchClient;
  savedObjectsRepository: ISavedObjectsRepository;
  index: string;
}

export class TaskManagerClaimNudgeService {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly savedObjectsRepository: ISavedObjectsRepository;
  private readonly index: string;
  private readonly claimNudgeSubject = new Subject<void>();
  private started = false;
  private abortController: AbortController | undefined;
  private baselineSet = false;
  private lastErrorLoggedAt = 0;

  constructor({
    logger,
    esClient,
    savedObjectsRepository,
    index,
  }: TaskManagerClaimNudgeServiceOptions) {
    this.logger = logger;
    this.esClient = esClient;
    this.savedObjectsRepository = savedObjectsRepository;
    this.index = index;
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
    const attributes: TaskManagerClaimNudge = {
      updated_at: new Date().toISOString(),
      nonce: v4(),
    };

    await this.savedObjectsRepository.create<TaskManagerClaimNudge>(
      TASK_MANAGER_CLAIM_NUDGE_SO_NAME,
      attributes,
      {
        id: GLOBAL_CLAIM_NUDGE_ID,
        overwrite: true,
        refresh: true,
      }
    );
  }

  private async watchCheckpoints() {
    let checkpoints: estypes.FleetCheckpoint[] = [];

    while (this.started) {
      this.abortController = new AbortController();

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
