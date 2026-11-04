/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { Observable } from 'rxjs';
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

// The values below are those of the JobRunner, which the job wizards use to follow the progress of a job
const REFRESH_INTERVAL_MS = 250;
const NODE_ASSIGNMENT_CHECK_REFRESH_INTERVAL_MS = 2000;
const TARGET_PROGRESS_DELTA = 2;
const REFRESH_RATE_ADJUSTMENT_DELAY_MS = 2000;

export interface WatchProgressParams {
  jobId: string;
  /** The data which the job analyzes. */
  timeRange: TimeRangeMs;
  /** Whether the datafeed was left running after it caught up. */
  runInRealTime: boolean;
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

  /**
   * Follows how much of the data the job has analyzed, as a percentage, once its datafeed was started.
   * It emits the progress as it changes and completes with 100, which is when the job has finished analyzing
   * the data, or has caught up with it when it was left running in real time. Unsubscribe to stop following it.
   */
  public watchProgress({
    jobId,
    timeRange: { start, end },
    runInRealTime,
  }: WatchProgressParams): Observable<number> {
    return new Observable<number>((subscriber) => {
      let isStopped = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let refreshInterval = REFRESH_INTERVAL_MS;
      let percentageComplete = 0;
      let isAdjustingRefreshInterval = false;
      const startedAt = Date.now();

      const checkLater = (check: () => Promise<void>, delayMs: number) => {
        timeout = setTimeout(() => {
          check().catch((error) => subscriber.error(error));
        }, delayMs);
      };

      // Adjusts the refresh interval so that each check changes the percentage by about the target
      const adjustRefreshInterval = (progress: number) => {
        if (!isAdjustingRefreshInterval) {
          // for the first couple of seconds of the job running, the refresh interval is not adjusted
          if (Date.now() - startedAt <= REFRESH_RATE_ADJUSTMENT_DELAY_MS) {
            return;
          }
          isAdjustingRefreshInterval = true;
        }

        const progressDelta = progress - percentageComplete;
        if (progressDelta !== 0) {
          refreshInterval = Math.max(
            REFRESH_INTERVAL_MS,
            Math.floor(refreshInterval * (TARGET_PROGRESS_DELTA / progressDelta))
          );
        }
      };

      const checkProgress = async () => {
        const {
          isRunning,
          progress: reportedProgress,
          isJobClosed,
        } = await this.mlApi.jobs.getLookBackProgress(jobId, start, end);
        if (isStopped) return;

        // A job in real time keeps running, so it is the progress which says it has caught up.
        const isFinished = runInRealTime ? reportedProgress >= 100 : !isRunning && isJobClosed;
        if (isFinished) {
          // The progress may be lower than 100 when the job finishes, as it is calculated from the latest
          // record timestamp, which may be earlier than the end of the time range.
          subscriber.next(100);
          subscriber.complete();
          return;
        }

        // Not 100 while the job is still running, which is what tells that it has finished
        const progress = reportedProgress >= 100 ? 99 : reportedProgress;
        adjustRefreshInterval(progress);
        percentageComplete = progress;
        subscriber.next(progress);
        checkLater(checkProgress, refreshInterval);
      };

      // The progress is only reported once the job is assigned to a node
      const checkJobIsAssigned = async () => {
        const { jobs } = await this.mlApi.getJobStats({ jobId });
        if (isStopped) return;
        if (jobs.length > 0 && jobs[0].node !== undefined) {
          await checkProgress();
        } else {
          checkLater(checkJobIsAssigned, NODE_ASSIGNMENT_CHECK_REFRESH_INTERVAL_MS);
        }
      };

      subscriber.next(0);
      checkJobIsAssigned().catch((error) => subscriber.error(error));

      return () => {
        isStopped = true;
        clearTimeout(timeout);
      };
    });
  }
}
