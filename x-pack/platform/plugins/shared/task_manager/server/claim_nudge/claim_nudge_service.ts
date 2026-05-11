/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { Subject } from 'rxjs';
import type { ElasticsearchClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { TASK_MANAGER_CLAIM_NUDGE_SO_NAME } from '../saved_objects';
import type { TaskManagerClaimNudge } from '../saved_objects/schemas/task_manager_claim_nudge';

const GLOBAL_CLAIM_NUDGE_ID = 'global';
const CHECKPOINT_TIMEOUT = '30s';
const ERROR_RETRY_DELAY_MS = 1_000;

interface GlobalCheckpointsResponse {
  global_checkpoints: number[];
  timed_out: boolean;
}

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

  public get claimNudge$() {
    return this.claimNudgeSubject.asObservable();
  }

  public start() {
    if (this.started) {
      return;
    }

    this.started = true;
    this.baselineSet = false;
    void this.watchCheckpoints();
  }

  public stop() {
    this.started = false;
    this.abortController?.abort();
    this.abortController = undefined;
  }

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
    let checkpoints: number[] = [];

    while (this.started) {
      this.abortController = new AbortController();

      try {
        const response = await this.esClient.fleet.globalCheckpoints(
          {
            index: this.index,
            wait_for_advance: true,
            wait_for_index: true,
            checkpoints,
            timeout: CHECKPOINT_TIMEOUT,
          },
          { signal: this.abortController.signal, retryOnTimeout: false }
        );
        const { global_checkpoints: nextCheckpoints, timed_out } =
          response as unknown as GlobalCheckpointsResponse;

        const hasAdvanced =
          this.baselineSet &&
          !timed_out &&
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

        this.logger.debug(
          `Failed to watch Task Manager claim nudge checkpoints for index ${
            this.index
          }: ${this.getErrorMessage(err)}`
        );
        await this.delay(ERROR_RETRY_DELAY_MS);
      } finally {
        this.abortController = undefined;
      }
    }
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
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return err.message;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return String(err);
  }

  private delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
