/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AgentExecutionClient } from '../persistence';
import { EXECUTION_HEARTBEAT_INTERVAL_MS } from '../constants';

/**
 * Periodically writes a `last_heartbeat` timestamp to the execution document while a task runs,
 * signalling to the following (UI) node that the executing node is still alive. This is
 * independent of event activity, so long silent steps (slow model answers, context compaction)
 * keep the execution alive even when no events are emitted.
 */
export class HeartbeatReporter {
  private readonly executionId: string;
  private readonly executionClient: AgentExecutionClient;
  private readonly logger: Logger;
  private intervalId: ReturnType<typeof setInterval> | undefined;
  private stopped = false;

  constructor({
    executionId,
    executionClient,
    logger,
  }: {
    executionId: string;
    executionClient: AgentExecutionClient;
    logger: Logger;
  }) {
    this.executionId = executionId;
    this.executionClient = executionClient;
    this.logger = logger;
  }

  /**
   * Write an initial heartbeat immediately, then keep writing on a fixed interval.
   */
  start(): void {
    if (this.stopped) {
      return;
    }
    this.writeHeartbeat();
    this.intervalId = setInterval(() => {
      this.writeHeartbeat();
    }, EXECUTION_HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop reporting heartbeats and clean up.
   */
  stop(): void {
    this.stopped = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private writeHeartbeat(): void {
    if (this.stopped) {
      return;
    }
    this.executionClient.updateHeartbeat(this.executionId).catch((err) => {
      this.logger.warn(
        `Failed to update heartbeat for execution ${this.executionId}: ${err.message}`
      );
    });
  }
}
