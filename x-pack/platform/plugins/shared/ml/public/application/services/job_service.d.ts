/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import type { MlApi } from './ml_api_service';

export interface ExistingJobsAndGroups {
  jobIds: string[];
  groupIds: string[];
}

export declare interface MlJobService {
  jobs: CombinedJob[];
  skipTimeRangeStep: boolean;
  getJob(jobId: string): CombinedJob;
  loadJobsWrapper(): Promise<CombinedJob[]>;
  customUrlsByJob: Record<string, any[]>;
  detectorsByJob: Record<string, any>;
}

export const mlJobServiceFactory: (mlApi: MlApi) => MlJobService;

export const useMlJobService: () => MlJobService;
