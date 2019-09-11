/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ExistingJobsAndGroups {
  jobIds: string[];
  groupIds: string[];
}

declare interface JobService {
  currentJob: any;
  tempJobCloningObjects: {
    job: any;
    skipTimeRangeStep: boolean;
    start?: number;
    end?: number;
  };
  skipTimeRangeStep: boolean;
  saveNewJob(job: any): Promise<any>;
  cloneJob(job: any): any;
  openJob(jobId: string): Promise<any>;
  saveNewDatafeed(datafeedConfig: any, jobId: string): Promise<any>;
  startDatafeed(
    datafeedId: string,
    jobId: string,
    start: number | undefined,
    end: number | undefined
  ): Promise<any>;
  createResultsUrl(jobId: string[], start: number, end: number, location: string): string;
  getJobAndGroupIds(): ExistingJobsAndGroups;
}

export const mlJobService: JobService;
