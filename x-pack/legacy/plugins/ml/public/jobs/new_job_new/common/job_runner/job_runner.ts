/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { ml } from '../../../../services/ml_api_service';
import { mlJobService } from '../../../../services/job_service';
import { JobCreator } from '../job_creator';
import { DatafeedId, JobId } from '../job_creator/configs';
import { DATAFEED_STATE } from '../../../../../common/constants/states';

const REFRESH_INTERVAL_MS = 100;
type Progress = number;
export type ProgressSubscriber = (progress: number) => void;

export class JobRunner {
  private _jobId: JobId;
  private _datafeedId: DatafeedId;
  private _start: number = 0;
  private _end: number = 0;
  private _datafeedState: DATAFEED_STATE = DATAFEED_STATE.STOPPED;
  private _refreshInterval: number = REFRESH_INTERVAL_MS;

  private _progress$: BehaviorSubject<Progress>;
  private _percentageComplete: Progress = 0;
  private _stopRefreshPoll: {
    stop: boolean;
  };
  private _subscribers: ProgressSubscriber[];

  constructor(jobCreator: JobCreator) {
    this._jobId = jobCreator.jobId;
    this._datafeedId = jobCreator.datafeedId;
    this._start = jobCreator.start;
    this._end = jobCreator.end;
    this._percentageComplete = 0;
    this._stopRefreshPoll = jobCreator.stopAllRefreshPolls;

    this._progress$ = new BehaviorSubject(this._percentageComplete);
    this._subscribers = jobCreator.subscribers;
  }

  public get datafeedState(): DATAFEED_STATE {
    return this._datafeedState;
  }

  public set refreshInterval(v: number) {
    this._refreshInterval = v;
  }

  public resetInterval() {
    this._refreshInterval = REFRESH_INTERVAL_MS;
  }

  private async openJob(): Promise<void> {
    try {
      await mlJobService.openJob(this._jobId);
    } catch (error) {
      throw error;
    }
  }

  // start the datafeed and then start polling for progress
  // the complete percentage is added to an observable
  // so all pre-subscribed listeners can follow along.
  private async _startDatafeed(
    start: number | undefined,
    end: number | undefined,
    pollProgress: boolean
  ): Promise<boolean> {
    try {
      // link the _subscribers list from the JobCreator
      // to the progress BehaviorSubject.
      const subscriptions =
        pollProgress === true ? this._subscribers.map(s => this._progress$.subscribe(s)) : [];

      await this.openJob();
      const { started } = await mlJobService.startDatafeed(
        this._datafeedId,
        this._jobId,
        start,
        end
      );

      this._datafeedState = DATAFEED_STATE.STARTED;
      this._percentageComplete = 0;

      const check = async () => {
        const { isRunning, progress } = await this.getProgress();

        this._percentageComplete = progress;
        this._progress$.next(this._percentageComplete);

        if (isRunning === true && this._stopRefreshPoll.stop === false) {
          setTimeout(async () => {
            await check();
          }, this._refreshInterval);
        } else {
          // job has finished running, set progress to 100%
          // it may be lower than 100 on completion as the progress
          // is calculated based on latest_record_timestamp which may be earlier
          // than the end date supplied to the datafeed
          this._progress$.next(100);
          // unsubscribe everyone
          subscriptions.forEach(s => s.unsubscribe());
        }
      };
      // wait for the first check to run and then return success.
      // all subsequent checks will update the observable
      if (pollProgress === true) {
        await check();
      }
      return started;
    } catch (error) {
      throw error;
    }
  }

  public async startDatafeed() {
    return await this._startDatafeed(this._start, this._end, true);
  }

  public async startDatafeedInRealTime(continueJob: boolean) {
    // if continuing a job, set the start to be the end date
    const start = continueJob ? this._end : this._start;
    return await this._startDatafeed(start, undefined, false);
  }

  public async getProgress(): Promise<{ progress: Progress; isRunning: boolean }> {
    return await ml.jobs.getLookBackProgress(this._jobId, this._start, this._end);
  }

  public subscribeToProgress(func: ProgressSubscriber) {
    this._progress$.subscribe(func);
  }

  public async isRunning(): Promise<boolean> {
    const { isRunning } = await this.getProgress();
    return isRunning;
  }
}
