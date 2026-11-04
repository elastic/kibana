/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public/types';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { CREATED_BY_LABEL } from '../../../../../common/constants/new_job';
import type { JobSuggestion } from '../../../../../common/types/job_suggestions';
import type { MlApi } from '../../../services/ml_api_service';
import { type CreateState, QuickJobCreatorBase } from '../job_from_dashboard/quick_create_job_base';

export interface TimeRangeMs {
  start: number;
  end: number;
}

export interface CreateSuggestedJobParams {
  suggestion: JobSuggestion;
  jobId: string;
  /** The data which the job analyzes. Ignored for the start time when the job is not started. */
  timeRange: TimeRangeMs;
  startJob: boolean;
  /** Leaves the datafeed running after it has caught up, so it analyzes new data as it arrives. */
  runInRealTime: boolean;
}

/**
 * Creates the job and datafeed of a suggestion, and starts them,
 * without going through the job wizards.
 */
export class QuickSuggestedJobCreator extends QuickJobCreatorBase {
  constructor(
    dataViews: DataViewsContract,
    kibanaConfig: IUiSettingsClient,
    timeFilter: TimefilterContract,
    share: SharePluginStart,
    mlApi: MlApi,
    cps?: CPSPluginStart
  ) {
    super(dataViews, kibanaConfig, timeFilter, share, mlApi, cps);
  }

  /** The earliest and latest times of the documents which the suggestion's datafeed reads. */
  public async getFullTimeRange({ job, datafeed }: JobSuggestion): Promise<TimeRangeMs> {
    const { start, end } = await this.mlApi.getTimeFieldRange({
      index: datafeed.indices.join(','),
      timeFieldName: job.data_description.time_field,
      query: datafeed.query,
    });
    return { start, end };
  }

  public async createAndSaveJob({
    suggestion,
    jobId,
    timeRange: { start, end },
    startJob,
    runInRealTime,
  }: CreateSuggestedJobParams): Promise<CreateState> {
    const { job, datafeed } = cloneDeep(suggestion);

    return this.putJobAndDataFeed({
      jobId,
      jobConfig: job as unknown as Job,
      datafeedConfig: datafeed as unknown as Datafeed,
      createdByLabel: job.custom_settings?.created_by as CREATED_BY_LABEL,
      start,
      end,
      startJob,
      runInRealTime,
    });
  }
}
