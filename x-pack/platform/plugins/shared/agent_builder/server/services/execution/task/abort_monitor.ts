/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ExecutionStatus } from '../types';
import type { AgentExecutionClient } from '../persistence';
import { ABORT_POLL_INTERVAL_MS } from '../constants';

/**
 * Monitors an agent execution for abort requests by polling the execution status.
 * When the status becomes 'aborted', triggers the abort controller.
 */
export class AbortMonitor {
  private readonly executionId: string;
  private readonly executionClient: AgentExecutionClient;
  private readonly abortController: AbortController;
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
    this.abortController = new AbortController();
    this.logger = logger;
  }

  /**
   * Get the abort signal to pass to the agent execution code.
   */
  getSignal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Start polling for abort status.
   */
  start(): void {
    if (this.stopped) {
      return;
    }
    this.intervalId = setInterval(() => {
      this.checkAbortStatus().catch((err) => {
        this.logger.error(`Error checking abort status for execution ${this.executionId}: ${err}`);
      });
    }, ABORT_POLL_INTERVAL_MS);
  }

  /**
   * Stop polling and clean up.
   */
  stop(): void {
    this.stopped = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async checkAbortStatus(): Promise<void> {
    if (this.stopped || this.abortController.signal.aborted) {
      return;
    }

    try {
      const execution = await this.executionClient.get(this.executionId);
      if (!execution) {
        return;
      }
      if (execution.status === ExecutionStatus.aborted) {
        this.logger.info(`Execution ${this.executionId} was aborted, propagating abort signal`);
        this.abortController.abort();
        this.stop();
      } else if (
        execution.status === ExecutionStatus.completed ||
        execution.status === ExecutionStatus.failed
      ) {
        this.stop();
      }
    } catch (err) {
      this.logger.warn(
        `Failed to check abort status for execution ${this.executionId}: ${err.message}`
      );
    }
  }
}
