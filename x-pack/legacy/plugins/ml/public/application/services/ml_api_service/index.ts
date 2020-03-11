/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { http, http$ } from '../http_service';

import { annotations } from './annotations';
import { dataFrameAnalytics } from './data_frame_analytics';
import { filters } from './filters';
import { results } from './results';
import { jobs } from './jobs';
import { fileDatavisualizer } from './datavisualizer';
import { MlServerDefaults, MlServerLimits } from '../ml_server_info';

import { PrivilegesResponse } from '../../../../common/types/privileges';
import { Calendar, CalendarId, UpdateCalendar } from '../../../../common/types/calendars';
import { CombinedJob } from '../../../../common/types/anomaly_detection_jobs';
import { ES_AGGREGATION } from '../../../../common/constants/aggregation_types';

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

// TODO This is not a complete representation of all methods of `ml.*`.
// It just satisfies needs for other parts of the code area which use
// TypeScript and rely on the methods typed in here.
// This allows the import of `ml` into TypeScript code.
interface EsIndex {
  name: string;
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

export interface GetTimeFieldRangeResponse {
  success: boolean;
  start: { epoch: number; string: string };
  end: { epoch: number; string: string };
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

export function basePath() {
  return '/api/ml';
}

export const ml = {
  getJobs(obj?: { jobId?: string }) {
    const jobId = obj && obj.jobId ? `/${obj.jobId}` : '';
    return http({
      path: `${basePath()}/anomaly_detectors${jobId}`,
    });
  },

  getJobStats(obj: { jobId?: string }) {
    const jobId = obj && obj.jobId ? `/${obj.jobId}` : '';
    return http({
      path: `${basePath()}/anomaly_detectors${jobId}/_stats`,
    });
  },

  addJob({ jobId, job }: { jobId: string; job: any }) {
    const body = JSON.stringify({ job });
    return http({
      path: `${basePath()}/anomaly_detectors/${jobId}`,
      method: 'PUT',
      body,
    });
  },

  openJob({ jobId }: { jobId: string }) {
    return http({
      path: `${basePath()}/anomaly_detectors/${jobId}/_open`,
      method: 'POST',
    });
  },

  closeJob({ jobId }: { jobId: string }) {
    return http({
      path: `${basePath()}/anomaly_detectors/${jobId}/_close`,
      method: 'POST',
    });
  },

  deleteJob({ jobId }: { jobId: string }) {
    return http({
      path: `${basePath()}/anomaly_detectors/${jobId}`,
      method: 'DELETE',
    });
  },

  forceDeleteJob({ jobId }: { jobId: string }) {
    return http({
      path: `${basePath()}/anomaly_detectors/${jobId}?force=true`,
      method: 'DELETE',
    });
  },

  updateJob({ jobId, job }: { jobId: string; job: any }) {
    const body = JSON.stringify({ job });
    return http({
      path: `${basePath()}/anomaly_detectors/${jobId}/_update`,
      method: 'POST',
      body,
    });
  },

  estimateBucketSpan(obj: BucketSpanEstimatorData): Promise<BucketSpanEstimatorResponse> {
    const body = JSON.stringify(obj);
    return http({
      path: `${basePath()}/validate/estimate_bucket_span`,
      method: 'POST',
      body,
    });
  },

  validateJob({ job }: { job: any }) {
    const body = JSON.stringify({ job });
    return http({
      path: `${basePath()}/validate/job`,
      method: 'POST',
      body,
    });
  },

  validateCardinality$(job: CombinedJob): Observable<CardinalityValidationResults> {
    const body = JSON.stringify({ job });
    return http$(`${basePath()}/validate/cardinality`, {
      method: 'POST',
      body,
    });
  },

  getDatafeeds(obj: { datafeedId: string }) {
    const datafeedId = obj && obj.datafeedId ? `/${obj.datafeedId}` : '';
    return http({
      path: `${basePath()}/datafeeds${datafeedId}`,
    });
  },

  getDatafeedStats(obj: { datafeedId: string }) {
    const datafeedId = obj && obj.datafeedId ? `/${obj.datafeedId}` : '';
    return http({
      path: `${basePath()}/datafeeds${datafeedId}/_stats`,
    });
  },

  addDatafeed({ datafeedId, datafeedConfig }: { datafeedId: string; datafeedConfig: any }) {
    const body = JSON.stringify({ datafeedConfig });
    return http({
      path: `${basePath()}/datafeeds/${datafeedId}`,
      method: 'PUT',
      body,
    });
  },

  updateDatafeed({ datafeedId, datafeedConfig }: { datafeedId: string; datafeedConfig: any }) {
    const body = JSON.stringify({ datafeedConfig });
    return http({
      path: `${basePath()}/datafeeds/${datafeedId}/_update`,
      method: 'POST',
      body,
    });
  },

  deleteDatafeed({ datafeedId }: { datafeedId: string }) {
    return http({
      path: `${basePath()}/datafeeds/${datafeedId}`,
      method: 'DELETE',
    });
  },

  forceDeleteDatafeed({ datafeedId }: { datafeedId: string }) {
    return http({
      path: `${basePath()}/datafeeds/${datafeedId}?force=true`,
      method: 'DELETE',
    });
  },

  startDatafeed({ datafeedId, start, end }: { datafeedId: string; start: number; end: number }) {
    const body = JSON.stringify({
      ...(start !== undefined ? { start } : {}),
      ...(end !== undefined ? { end } : {}),
    });

    return http({
      path: `${basePath()}/datafeeds/${datafeedId}/_start`,
      method: 'POST',
      body,
    });
  },

  stopDatafeed({ datafeedId }: { datafeedId: string }) {
    return http({
      path: `${basePath()}/datafeeds/${datafeedId}/_stop`,
      method: 'POST',
    });
  },

  datafeedPreview({ datafeedId }: { datafeedId: string }) {
    return http({
      path: `${basePath()}/datafeeds/${datafeedId}/_preview`,
      method: 'GET',
    });
  },

  validateDetector({ detector }: { detector: any }) {
    const body = JSON.stringify({ detector });
    return http({
      path: `${basePath()}/anomaly_detectors/_validate/detector`,
      method: 'POST',
      body,
    });
  },

  forecast({ jobId, duration }: { jobId: string; duration?: string }) {
    const body = JSON.stringify({
      ...(duration !== undefined ? { duration } : {}),
    });

    return http({
      path: `${basePath()}/anomaly_detectors/${jobId}/_forecast`,
      method: 'POST',
      body,
    });
  },

  overallBuckets({
    jobId,
    topN,
    bucketSpan,
    start,
    end,
  }: {
    jobId: string;
    topN: string;
    bucketSpan: string;
    start: number;
    end: number;
  }) {
    const body = JSON.stringify({ topN, bucketSpan, start, end });
    return http({
      path: `${basePath()}/anomaly_detectors/${jobId}/results/overall_buckets`,
      method: 'POST',
      body,
    });
  },

  hasPrivileges(obj: any) {
    const body = JSON.stringify(obj);
    return http({
      path: `${basePath()}/_has_privileges`,
      method: 'POST',
      body,
    });
  },

  checkMlPrivileges(): Promise<PrivilegesResponse> {
    return http({
      path: `${basePath()}/ml_capabilities`,
      method: 'GET',
    });
  },

  checkManageMLPrivileges(): Promise<PrivilegesResponse> {
    return http({
      path: `${basePath()}/ml_capabilities?ignoreSpaces=true`,
      method: 'GET',
    });
  },

  getNotificationSettings() {
    return http({
      path: `${basePath()}/notification_settings`,
      method: 'GET',
    });
  },

  getFieldCaps({ index, fields }: { index: string; fields: string[] }) {
    const body = JSON.stringify({
      ...(index !== undefined ? { index } : {}),
      ...(fields !== undefined ? { fields } : {}),
    });

    return http({
      path: `${basePath()}/indices/field_caps`,
      method: 'POST',
      body,
    });
  },

  recognizeIndex({ indexPatternTitle }: { indexPatternTitle: string }) {
    return http({
      path: `${basePath()}/modules/recognize/${indexPatternTitle}`,
      method: 'GET',
    });
  },

  listDataRecognizerModules() {
    return http({
      path: `${basePath()}/modules/get_module`,
      method: 'GET',
    });
  },

  getDataRecognizerModule({ moduleId }: { moduleId: string }) {
    return http({
      path: `${basePath()}/modules/get_module/${moduleId}`,
      method: 'GET',
    });
  },

  dataRecognizerModuleJobsExist({ moduleId }: { moduleId: string }) {
    return http({
      path: `${basePath()}/modules/jobs_exist/${moduleId}`,
      method: 'GET',
    });
  },

  setupDataRecognizerConfig({
    moduleId,
    prefix,
    groups,
    indexPatternName,
    query,
    useDedicatedIndex,
    startDatafeed,
    start,
    end,
    jobOverrides,
  }: {
    moduleId: string;
    prefix?: string;
    groups?: string[];
    indexPatternName?: string;
    query?: any;
    useDedicatedIndex?: boolean;
    startDatafeed?: boolean;
    start?: number;
    end?: number;
    jobOverrides?: any;
  }) {
    const body = JSON.stringify({
      prefix,
      groups,
      indexPatternName,
      query,
      useDedicatedIndex,
      startDatafeed,
      start,
      end,
      jobOverrides,
    });

    return http({
      path: `${basePath()}/modules/setup/${moduleId}`,
      method: 'POST',
      body,
    });
  },

  getVisualizerFieldStats({
    indexPatternTitle,
    query,
    timeFieldName,
    earliest,
    latest,
    samplerShardSize,
    interval,
    fields,
    maxExamples,
  }: {
    indexPatternTitle: string;
    query: any;
    timeFieldName?: string;
    earliest?: number;
    latest?: number;
    samplerShardSize?: number;
    interval?: string;
    fields?: any[];
    maxExamples?: number;
  }) {
    const body = JSON.stringify({
      query,
      timeFieldName,
      earliest,
      latest,
      samplerShardSize,
      interval,
      fields,
      maxExamples,
    });

    return http({
      path: `${basePath()}/data_visualizer/get_field_stats/${indexPatternTitle}`,
      method: 'POST',
      body,
    });
  },

  getVisualizerOverallStats({
    indexPatternTitle,
    query,
    timeFieldName,
    earliest,
    latest,
    samplerShardSize,
    aggregatableFields,
    nonAggregatableFields,
  }: {
    indexPatternTitle: string;
    query: any;
    timeFieldName?: string;
    earliest?: number;
    latest?: number;
    samplerShardSize?: number;
    aggregatableFields: string[];
    nonAggregatableFields: string[];
  }) {
    const body = JSON.stringify({
      query,
      timeFieldName,
      earliest,
      latest,
      samplerShardSize,
      aggregatableFields,
      nonAggregatableFields,
    });

    return http({
      path: `${basePath()}/data_visualizer/get_overall_stats/${indexPatternTitle}`,
      method: 'POST',
      body,
    });
  },

  /**
   * Gets a list of calendars
   * @param obj
   * @returns {Promise<unknown>}
   */
  calendars(obj?: { calendarId?: CalendarId; calendarIds?: CalendarId[] }): Promise<Calendar[]> {
    const { calendarId, calendarIds } = obj || {};
    let calendarIdsPathComponent = '';
    if (calendarId) {
      calendarIdsPathComponent = `/${calendarId}`;
    } else if (calendarIds) {
      calendarIdsPathComponent = `/${calendarIds.join(',')}`;
    }
    return http({
      path: `${basePath()}/calendars${calendarIdsPathComponent}`,
      method: 'GET',
    });
  },

  addCalendar(obj: any) {
    const body = JSON.stringify(obj);
    return http({
      path: `${basePath()}/calendars`,
      method: 'PUT',
      body,
    });
  },

  updateCalendar(obj: UpdateCalendar) {
    const calendarId = obj && obj.calendarId ? `/${obj.calendarId}` : '';
    const body = JSON.stringify(obj);
    return http({
      path: `${basePath()}/calendars${calendarId}`,
      method: 'PUT',
      body,
    });
  },

  deleteCalendar({ calendarId }: { calendarId?: string }) {
    return http({
      path: `${basePath()}/calendars/${calendarId}`,
      method: 'DELETE',
    });
  },

  mlNodeCount(): Promise<{ count: number }> {
    return http({
      path: `${basePath()}/ml_node_count`,
      method: 'GET',
    });
  },

  mlInfo(): Promise<MlInfoResponse> {
    return http({
      path: `${basePath()}/info`,
      method: 'GET',
    });
  },

  calculateModelMemoryLimit({
    indexPattern,
    splitFieldName,
    query,
    fieldNames,
    influencerNames,
    timeFieldName,
    earliestMs,
    latestMs,
  }: {
    indexPattern: string;
    splitFieldName: string;
    query: any;
    fieldNames: string[];
    influencerNames: string[];
    timeFieldName: string;
    earliestMs: number;
    latestMs: number;
  }): Promise<{ modelMemoryLimit: string }> {
    const body = JSON.stringify({
      indexPattern,
      splitFieldName,
      query,
      fieldNames,
      influencerNames,
      timeFieldName,
      earliestMs,
      latestMs,
    });

    return http({
      path: `${basePath()}/validate/calculate_model_memory_limit`,
      method: 'POST',
      body,
    });
  },

  getCardinalityOfFields({
    index,
    fieldNames,
    query,
    timeFieldName,
    earliestMs,
    latestMs,
  }: {
    index: string;
    fieldNames: string[];
    query: any;
    timeFieldName: string;
    earliestMs: number;
    latestMs: number;
  }) {
    const body = JSON.stringify({ index, fieldNames, query, timeFieldName, earliestMs, latestMs });

    return http({
      path: `${basePath()}/fields_service/field_cardinality`,
      method: 'POST',
      body,
    });
  },

  getTimeFieldRange({
    index,
    timeFieldName,
    query,
  }: {
    index: string;
    timeFieldName?: string;
    query: any;
  }): Promise<GetTimeFieldRangeResponse> {
    const body = JSON.stringify({ index, timeFieldName, query });

    return http({
      path: `${basePath()}/fields_service/time_field_range`,
      method: 'POST',
      body,
    });
  },

  esSearch(obj: any): Promise<any> {
    const body = JSON.stringify(obj);
    return http({
      path: `${basePath()}/es_search`,
      method: 'POST',
      body,
    });
  },

  esSearch$(obj: any): Observable<any> {
    const body = JSON.stringify(obj);
    return http$(`${basePath()}/es_search`, {
      method: 'POST',
      body,
    });
  },

  getIndices(): Promise<EsIndex[]> {
    const tempBasePath = '/api';
    return http({
      path: `${tempBasePath}/index_management/indices`,
      method: 'GET',
    });
  },

  annotations,
  dataFrameAnalytics,
  filters,
  results,
  jobs,
  fileDatavisualizer,
};
