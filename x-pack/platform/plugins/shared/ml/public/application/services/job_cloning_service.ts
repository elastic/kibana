/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { JobCreator } from '../jobs/new_job/common/job_creator/job_creator';

interface TempJobCloningData {
  createdBy: any;
  datafeed: any;
  job: any;
  skipTimeRangeStep: boolean;
  start?: any;
  end?: any;
  calendars: any;
  autoSetTimeRange?: boolean;
}

export class JobCloningService {
  // tempJobCloningData -> used to pass a job object between the job management page and
  // and the advanced wizard.
  // if populated when loading the advanced wizard, the job is used for cloning.
  // if populated when loading the job management page, the start datafeed modal
  // is automatically opened.
  private tempJobCloningData: TempJobCloningData = {
    createdBy: undefined,
    datafeed: undefined,
    job: undefined,
    skipTimeRangeStep: false,
    start: undefined,
    end: undefined,
    calendars: undefined,
    autoSetTimeRange: false,
  };

  public getJobCloningData(): Readonly<TempJobCloningData> {
    return this.tempJobCloningData;
  }

  clearJobCloningData() {
    this.tempJobCloningData = {
      createdBy: undefined,
      datafeed: undefined,
      job: undefined,
      skipTimeRangeStep: false,
      start: undefined,
      end: undefined,
      calendars: undefined,
      autoSetTimeRange: false,
    };
  }

  stashJobForCloning(
    jobCreator: JobCreator,
    skipTimeRangeStep: boolean,
    includeTimeRange: boolean,
    autoSetTimeRange: boolean = false
  ) {
    const tempJobCloningData: TempJobCloningData = {
      job: jobCreator.jobConfig,
      datafeed: jobCreator.datafeedConfig,
      createdBy: jobCreator.createdBy ?? undefined,
      // skip over the time picker step of the wizard
      skipTimeRangeStep,
      calendars: jobCreator.calendars,
      ...(includeTimeRange === true && autoSetTimeRange === false
        ? // auto select the start and end dates of the time picker
          {
            start: jobCreator.start,
            end: jobCreator.end,
          }
        : { autoSetTimeRange: true }),
    };

    this.tempJobCloningData = tempJobCloningData;
  }

  public checkForAutoStartDatafeed() {
    const job = this.tempJobCloningData.job;
    const datafeed = this.tempJobCloningData.datafeed;
    if (job !== undefined) {
      this.tempJobCloningData.job = undefined;
      this.tempJobCloningData.datafeed = undefined;
      this.tempJobCloningData.createdBy = undefined;

      const hasDatafeed = isPopulatedObject(datafeed);
      const datafeedId = hasDatafeed ? datafeed.datafeed_id : '';
      return {
        id: job.job_id,
        hasDatafeed,
        latestTimestampSortValue: 0,
        datafeedId,
      };
    }
  }

  public stashJobCloningData(config: TempJobCloningData) {
    this.tempJobCloningData = config;
  }

  public get createdBy() {
    return this.tempJobCloningData.createdBy;
  }
  public get datafeed() {
    return this.tempJobCloningData.datafeed;
  }
  public get job() {
    return this.tempJobCloningData.job;
  }
  public get skipTimeRangeStep() {
    return this.tempJobCloningData.skipTimeRangeStep;
  }
  public get start() {
    return this.tempJobCloningData.start;
  }
  public get end() {
    return this.tempJobCloningData.end;
  }
  public get calendars() {
    return this.tempJobCloningData.calendars;
  }
  public get autoSetTimeRange() {
    return this.tempJobCloningData.autoSetTimeRange;
  }
}

export const jobCloningService = new JobCloningService();
