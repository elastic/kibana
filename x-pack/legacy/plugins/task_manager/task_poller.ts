/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains the logic for polling the task manager index for new work.
 */

import { Subject, Subscription, Observable, interval } from 'rxjs';
import { buffer, throttle } from 'rxjs/operators';
import { Result, asOk, asErr } from './lib/result_type';
import { Logger } from './types';

type WorkFn<H, T> = (...params: H[]) => Promise<T>;

interface Opts<T, H> {
  pollInterval: number;
  logger: Logger;
  work: WorkFn<H, T>;
}

/**
 * Performs work on a scheduled interval, logging any errors. This waits for work to complete
 * (or error) prior to attempting another run.
 */
export class TaskPoller<T, H> {
  private logger: Logger;
  private work: WorkFn<H, T>;
  private poller$: Observable<H[]>;
  private pollPhaseResults$: Subject<Result<T, Error>>;
  private claimRequestQueue$: Subject<H>;
  private pollingSubscription: Subscription;

  /**
   * Constructs a new TaskPoller.
   *
   * @param opts
   * @prop {number} pollInterval - How often, in milliseconds, we will run the work function
   * @prop {Logger} logger - The task manager logger
   * @prop {WorkFn} work - An empty, asynchronous function that performs the desired work
   */
  constructor(opts: Opts<T, H>) {
    this.logger = opts.logger;
    this.work = opts.work;

    this.pollingSubscription = Subscription.EMPTY;
    this.pollPhaseResults$ = new Subject();
    this.claimRequestQueue$ = new Subject<H>();
    this.poller$ = this.claimRequestQueue$.pipe(
      buffer(interval(opts.pollInterval).pipe(throttle(ev => this.pollPhaseResults$)))
    );
  }

  /**
   * Starts the poller. If the poller is already running, this has no effect.
   */
  public async start() {
    if (this.pollingSubscription && !this.pollingSubscription.closed) {
      return;
    }

    this.pollingSubscription = this.poller$.subscribe(requests => {
      // console.log({ requests });
      this.attemptWork(...requests);
    });
  }

  /**
   * Stops the poller.
   */
  public stop() {
    this.pollingSubscription.unsubscribe();
  }

  public queueWork(request: H) {
    this.claimRequestQueue$.next(request);
  }

  /**
   * Runs the work function, this is called in respose to the polling stream
   */
  private attemptWork = async (...requests: H[]) => {
    try {
      this.pollPhaseResults$.next(asOk(await this.work(...requests)));
    } catch (err) {
      this.logger.error(`Failed to poll for work: ${err}`);
      this.pollPhaseResults$.next(asErr(err));
    }
  };
}
