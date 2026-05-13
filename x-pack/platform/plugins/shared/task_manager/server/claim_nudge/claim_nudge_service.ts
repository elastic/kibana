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

export interface TaskManagerClaimNudgeService {
  readonly claimNudge$: Observable<void>;
  start(): void;
  stop(): void;
  notify(): Promise<void>;
  emitLocalNudge(source: string): void;
}

class BaseClaimNudgeService implements TaskManagerClaimNudgeService {
  protected readonly logger: Logger;
  protected readonly claimNudgeSubject = new Subject<void>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public get claimNudge$() {
    return this.claimNudgeSubject.asObservable();
  }

  public start() {}
  public stop() {}

  public async notify() {}

  public emitLocalNudge(source: string) {
    this.logger.info(`[claim_nudge] received_nudge source=${source}, triggering_immediate_poll`);
    this.claimNudgeSubject.next();
  }
}

export class NoopClaimNudgeService extends BaseClaimNudgeService {
  public override async notify() {
    this.logger.info('[claim_nudge] strategy=noop, skipping notify');
  }
}

export class GlobalCheckpointsClaimNudgeService extends BaseClaimNudgeService {
  public override async notify() {
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

  public override async notify() {
    await this.client.notify();
  }
}
