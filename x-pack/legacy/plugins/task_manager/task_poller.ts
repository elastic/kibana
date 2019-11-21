/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains the logic for polling the task manager index for new work.
 */

import { performance } from 'perf_hooks';
import { Logger } from './types';

type WorkFn<T> = () => Promise<T>;

interface Opts<T> {
  pollInterval: number;
  logger: Logger;
  work: WorkFn<T>;
}

/**
 * Performs work on a scheduled interval, logging any errors. This waits for work to complete
 * (or error) prior to attempting another run.
 */
export class TaskPoller<T> {
  private isStarted = false;
  private isWorking = false;
  private timeout: any;
  private pollInterval: number;
  private logger: Logger;
  private work: WorkFn<T>;

  /**
   * Constructs a new TaskPoller.
   *
   * @param opts
   * @prop {number} pollInterval - How often, in milliseconds, we will run the work function
   * @prop {Logger} logger - The task manager logger
   * @prop {WorkFn} work - An empty, asynchronous function that performs the desired work
   */
  constructor(opts: Opts<T>) {
    this.pollInterval = opts.pollInterval;
    this.logger = opts.logger;
    this.work = opts.work;
  }

  /**
   * Starts the poller. If the poller is already running, this has no effect.
   */
  public async start() {
    if (this.isStarted) {
      return;
    }

    this.isStarted = true;

    const poll = async () => {
      await this.attemptWork();

      performance.mark('TaskPoller.sleep');
      if (this.isStarted) {
        this.timeout = setTimeout(
          tryAndLogOnError(() => {
            performance.mark('TaskPoller.poll');
            performance.measure('TaskPoller.sleepDuration', 'TaskPoller.sleep', 'TaskPoller.poll');
            poll();
          }, this.logger),
          this.pollInterval
        );
      }
    };

    poll();
  }

  /**
   * Stops the poller.
   */
  public stop() {
    this.isStarted = false;
    clearTimeout(this.timeout);
    this.timeout = undefined;
  }

  /**
   * Runs the work function. If the work function is currently running,
   * this has no effect.
   */
  public async attemptWork() {
    if (!this.isStarted || this.isWorking) {
      return;
    }

    this.isWorking = true;

    try {
      await this.work();
    } catch (err) {
      this.logger.error(`Failed to poll for work: ${err}`);
    } finally {
      this.isWorking = false;
    }
  }
}

function tryAndLogOnError(fn: Function, logger: Logger): Function {
  return () => {
    try {
      fn();
    } catch (err) {
      logger.error(`Task Poller polling phase failed: ${err}`);
    }
  };
}
