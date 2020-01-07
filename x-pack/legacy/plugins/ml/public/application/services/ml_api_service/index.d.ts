/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { Annotation } from '../../../../common/types/annotations';
import { AggFieldNamePair } from '../../../../common/types/fields';
import { ExistingJobsAndGroups } from '../job_service';
import { PrivilegesResponse } from '../../../../common/types/privileges';
import { MlSummaryJobs } from '../../../../common/types/jobs';
import { MlServerDefaults, MlServerLimits } from '../ml_server_info';
import { ES_AGGREGATION } from '../../../../common/constants/aggregation_types';
import { DataFrameAnalyticsStats } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';
import { JobMessage } from '../../../../common/types/audit_message';
import { DataFrameAnalyticsConfig } from '../../data_frame_analytics/common/analytics';
import { DeepPartial } from '../../../../common/types/common';
import { PartitionFieldsDefinition } from '../results_service/result_service_rx';
import { annotations } from './annotations';
import { Calendar, CalendarId, UpdateCalendar } from '../../../../common/types/calendars';
import { CombinedJob, JobId } from '../../jobs/new_job/common/job_creator/configs';

// TODO This is not a complete representation of all methods of `ml.*`.
// It just satisfies needs for other parts of the code area which use
// TypeScript and rely on the methods typed in here.
// This allows the import of `ml` into TypeScript code.
interface EsIndex {
  name: string;
}

export interface GetTimeFieldRangeResponse {
  success: boolean;
  start: { epoch: number; string: string };
  end: { epoch: number; string: string };
}

export interface BucketSpanEstimatorData {
  aggTypes: Array<ES_AGGREGATION | null>;
  duration: {
    start: number;
    end: number;
  };
  fields: Array<string | null>;
  index: string;
  query: any;
  splitField: string | undefined;
  timeField: string | undefined;
}

export interface BucketSpanEstimatorResponse {
  name: string;
  ms: number;
  error?: boolean;
  message?: { msg: string } | string;
}

export interface MlInfoResponse {
  defaults: MlServerDefaults;
  limits: MlServerLimits;
  native_code: {
    build_hash: string;
    version: string;
  };
  upgrade_mode: boolean;
  cloudId?: string;
}

export interface SuccessCardinality {
  id: 'success_cardinality';
}

export interface CardinalityModelPlotHigh {
  id: 'cardinality_model_plot_high';
  modelPlotCardinality: number;
}

export type CardinalityValidationResult = SuccessCardinality | CardinalityModelPlotHigh;
export type CardinalityValidationResults = CardinalityValidationResult[];

declare interface Ml {
  annotations: {
    deleteAnnotation(id: string | undefined): Promise<any>;
    indexAnnotation(annotation: Annotation): Promise<object>;
    getAnnotations: typeof annotations.getAnnotations;
  };

  dataFrameAnalytics: {
    getDataFrameAnalytics(analyticsId?: string): Promise<any>;
    getDataFrameAnalyticsStats(analyticsId?: string): Promise<GetDataFrameAnalyticsStatsResponse>;
    createDataFrameAnalytics(analyticsId: string, analyticsConfig: any): Promise<any>;
    evaluateDataFrameAnalytics(evaluateConfig: any): Promise<any>;
    explainDataFrameAnalytics(jobConfig: DeepPartial<DataFrameAnalyticsConfig>): Promise<any>;
    deleteDataFrameAnalytics(analyticsId: string): Promise<any>;
    startDataFrameAnalytics(analyticsId: string): Promise<any>;
    stopDataFrameAnalytics(
      analyticsId: string,
      force?: boolean,
      waitForCompletion?: boolean
    ): Promise<any>;
    getAnalyticsAuditMessages(analyticsId: string): Promise<any>;
  };

  hasPrivileges(obj: object): Promise<any>;

  checkMlPrivileges(): Promise<PrivilegesResponse>;
  checkManageMLPrivileges(): Promise<PrivilegesResponse>;
  getJobStats(obj: object): Promise<any>;
  getDatafeedStats(obj: object): Promise<any>;
  esSearch(obj: object): any;
  esSearch$(obj: object): Observable<any>;
  getIndices(): Promise<EsIndex[]>;
  dataRecognizerModuleJobsExist(obj: { moduleId: string }): Promise<any>;
  getDataRecognizerModule(obj: { moduleId: string }): Promise<any>;
  setupDataRecognizerConfig(obj: object): Promise<any>;
  getTimeFieldRange(obj: object): Promise<GetTimeFieldRangeResponse>;
  calculateModelMemoryLimit(obj: object): Promise<{ modelMemoryLimit: string }>;
  calendars(obj?: { calendarId?: CalendarId; calendarIds?: CalendarId[] }): Promise<Calendar[]>;
  updateCalendar(obj: UpdateCalendar): Promise<any>;

  getVisualizerFieldStats(obj: object): Promise<any>;
  getVisualizerOverallStats(obj: object): Promise<any>;

  results: {
    getMaxAnomalyScore: (jobIds: string[], earliestMs: number, latestMs: number) => Promise<any>;
    fetchPartitionFieldsValues: (
      jobId: JobId,
      searchTerm: Record<string, string>,
      criteriaFields: Array<{ fieldName: string; fieldValue: any }>,
      earliestMs: number,
      latestMs: number
    ) => Observable<PartitionFieldsDefinition>;
  };

  jobs: {
    jobsSummary(jobIds: string[]): Promise<MlSummaryJobs>;
    jobs(jobIds: string[]): Promise<object>;
    groups(): Promise<object>;
    updateGroups(updatedJobs: string[]): Promise<object>;
    forceStartDatafeeds(datafeedIds: string[], start: string, end: string): Promise<object>;
    stopDatafeeds(datafeedIds: string[]): Promise<object>;
    deleteJobs(jobIds: string[]): Promise<object>;
    closeJobs(jobIds: string[]): Promise<object>;
    jobAuditMessages(jobId: string, from?: string): Promise<JobMessage[]>;
    deletingJobTasks(): Promise<object>;
    newJobCaps(indexPatternTitle: string, isRollup: boolean): Promise<object>;
    newJobLineChart(
      indexPatternTitle: string,
      timeField: string,
      start: number,
      end: number,
      intervalMs: number,
      query: object,
      aggFieldNamePairs: AggFieldNamePair[],
      splitFieldName: string | null,
      splitFieldValue: string | null
    ): Promise<any>;
    newJobPopulationsChart(
      indexPatternTitle: string,
      timeField: string,
      start: number,
      end: number,
      intervalMs: number,
      query: object,
      aggFieldNamePairs: AggFieldNamePair[],
      splitFieldName: string
    ): Promise<any>;
    getAllJobAndGroupIds(): Promise<ExistingJobsAndGroups>;
    getLookBackProgress(
      jobId: string,
      start: number,
      end: number
    ): Promise<{ progress: number; isRunning: boolean; isJobClosed: boolean }>;
  };

  estimateBucketSpan(data: BucketSpanEstimatorData): Promise<BucketSpanEstimatorResponse>;

  mlNodeCount(): Promise<{ count: number }>;
  mlInfo(): Promise<MlInfoResponse>;
  getCardinalityOfFields(obj: Record<string, any>): any;
  validateCardinality$(job: CombinedJob): Observable<CardinalityValidationResults>;
}

declare const ml: Ml;

export interface GetDataFrameAnalyticsStatsResponseOk {
  node_failures?: object;
  count: number;
  data_frame_analytics: DataFrameAnalyticsStats[];
}

export interface GetDataFrameAnalyticsStatsResponseError {
  statusCode: number;
  error: string;
  message: string;
}

export type GetDataFrameAnalyticsStatsResponse =
  | GetDataFrameAnalyticsStatsResponseOk
  | GetDataFrameAnalyticsStatsResponseError;
