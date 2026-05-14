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

class BaseClaimNudgeService implements TaskManagerClaimNudgeService {
  protected readonly logger: Logger;
  protected readonly claimNudgeSubject = new Subject<ClaimNudgeEvent>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public get claimNudge$() {
    return this.claimNudgeSubject.asObservable();
  }

  public start() {}
  public stop() {}

  public async notify(_taskTargets?: ClaimNudgeTarget[]) {}

  public emitLocalNudge(source: string, taskTargets: ClaimNudgeTarget[] = []) {
    this.logger.info(
      `[claim_nudge] received_nudge source=${source} task_targets=${taskTargets.length}, triggering_immediate_poll`
    );
    this.claimNudgeSubject.next({ source, taskTargets });
  }
}

export class NoopClaimNudgeService extends BaseClaimNudgeService {
  public override async notify(_taskTargets?: ClaimNudgeTarget[]) {
    this.logger.info('[claim_nudge] strategy=noop, skipping notify');
  }
}

export class GlobalCheckpointsClaimNudgeService extends BaseClaimNudgeService {
  public override async notify(_taskTargets?: ClaimNudgeTarget[]) {
    this.logger.info(
      '[claim_nudge] strategy=global_checkpoints unavailable in this deployment, falling back to regular poll interval'
    );
  }
}

export class HttpClaimNudgeService extends BaseClaimNudgeService {
  private readonly client: HttpClaimNudgeClient;

  constructor(logger: Logger, client: HttpClaimNudgeClient) {
    super(logger);
    this.client = client;
  }

  public override async notify(taskTargets: ClaimNudgeTarget[] = []) {
    await this.client.notify(taskTargets);
  }
}
