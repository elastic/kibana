/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { HttpClaimNudgeClient } from './http_claim_nudge_client';

export interface ClaimNudgeTarget {
  taskId: string;
  version: string;
  taskType: string;
}

export interface ClaimNudgeEvent {
  source: string;
  taskTargets: ClaimNudgeTarget[];
}

export interface TaskManagerClaimNudgeService {
  readonly claimNudge$: Observable<ClaimNudgeEvent>;
  start(): void;
  stop(): void;
  notify(taskTargets?: ClaimNudgeTarget[]): Promise<void>;
  emitLocalNudge(source: string, taskTargets?: ClaimNudgeTarget[]): void;
}

type NotifyHandler = (taskTargets?: ClaimNudgeTarget[]) => Promise<void>;

class ClaimNudgeService implements TaskManagerClaimNudgeService {
  protected readonly logger: Logger;
  protected readonly claimNudgeSubject = new Subject<ClaimNudgeEvent>();
  private readonly notifyHandler: NotifyHandler;

  constructor(logger: Logger, notifyHandler: NotifyHandler = async () => {}) {
    this.logger = logger;
    this.notifyHandler = notifyHandler;
  }

  public get claimNudge$() {
    return this.claimNudgeSubject.asObservable();
  }

  public start() {}
  public stop() {}

  public async notify(taskTargets?: ClaimNudgeTarget[]) {
    await this.notifyHandler(taskTargets);
  }

  public emitLocalNudge(source: string, taskTargets: ClaimNudgeTarget[] = []) {
    this.logger.info(
      `[claim_nudge] received_nudge source=${source} task_targets=${taskTargets.length}, triggering_immediate_poll`
    );
    this.claimNudgeSubject.next({ source, taskTargets });
  }
}

export function createNoopClaimNudgeService(logger: Logger): TaskManagerClaimNudgeService {
  return new ClaimNudgeService(logger, async () => {
    logger.info('[claim_nudge] strategy=noop, skipping notify');
  });
}

export function createGlobalCheckpointsClaimNudgeService(
  logger: Logger
): TaskManagerClaimNudgeService {
  return new ClaimNudgeService(logger, async () => {
    logger.info(
      '[claim_nudge] strategy=global_checkpoints unavailable in this deployment, falling back to regular poll interval'
    );
  });
}

export function createHttpClaimNudgeService(
  logger: Logger,
  client: HttpClaimNudgeClient
): TaskManagerClaimNudgeService {
  return new ClaimNudgeService(logger, async (taskTargets = []) => {
    await client.notify(taskTargets);
  });
}
