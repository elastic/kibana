/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';
import { http, http$ } from '../http_service';

import { annotations } from './annotations';
import { dataFrameAnalytics } from './data_frame_analytics';
import { filters } from './filters';
import { results } from './results';
import { jobs } from './jobs';
import { fileDatavisualizer } from './datavisualizer';
import { getBasePath } from '../../util/dependency_cache';

export function basePath() {
  return getBasePath().prepend('/api/ml');
}

export const ml = {
  getJobs(obj) {
    const jobId = obj && obj.jobId ? `/${obj.jobId}` : '';
    return http({
      url: `${basePath()}/anomaly_detectors${jobId}`,
    });
  },

  getJobStats(obj) {
    const jobId = obj && obj.jobId ? `/${obj.jobId}` : '';
    return http({
      url: `${basePath()}/anomaly_detectors${jobId}/_stats`,
    });
  },

  addJob(obj) {
    return http({
      url: `${basePath()}/anomaly_detectors/${obj.jobId}`,
      method: 'PUT',
      data: obj.job,
    });
  },

  openJob(obj) {
    return http({
      url: `${basePath()}/anomaly_detectors/${obj.jobId}/_open`,
      method: 'POST',
    });
  },

  closeJob(obj) {
    return http({
      url: `${basePath()}/anomaly_detectors/${obj.jobId}/_close`,
      method: 'POST',
    });
  },

  deleteJob(obj) {
    return http({
      url: `${basePath()}/anomaly_detectors/${obj.jobId}`,
      method: 'DELETE',
    });
  },

  forceDeleteJob(obj) {
    return http({
      url: `${basePath()}/anomaly_detectors/${obj.jobId}?force=true`,
      method: 'DELETE',
    });
  },

  updateJob(obj) {
    return http({
      url: `${basePath()}/anomaly_detectors/${obj.jobId}/_update`,
      method: 'POST',
      data: obj.job,
    });
  },

  estimateBucketSpan(obj) {
    return http({
      url: `${basePath()}/validate/estimate_bucket_span`,
      method: 'POST',
      data: obj,
    });
  },

  validateJob(obj) {
    return http({
      url: `${basePath()}/validate/job`,
      method: 'POST',
      data: obj,
    });
  },

  validateCardinality$(obj) {
    return http$(`${basePath()}/validate/cardinality`, {
      method: 'POST',
      body: obj,
    });
  },

  getDatafeeds(obj) {
    const datafeedId = obj && obj.datafeedId ? `/${obj.datafeedId}` : '';
    return http({
      url: `${basePath()}/datafeeds${datafeedId}`,
    });
  },

  getDatafeedStats(obj) {
    const datafeedId = obj && obj.datafeedId ? `/${obj.datafeedId}` : '';
    return http({
      url: `${basePath()}/datafeeds${datafeedId}/_stats`,
    });
  },

  addDatafeed(obj) {
    return http({
      url: `${basePath()}/datafeeds/${obj.datafeedId}`,
      method: 'PUT',
      data: obj.datafeedConfig,
    });
  },

  updateDatafeed(obj) {
    return http({
      url: `${basePath()}/datafeeds/${obj.datafeedId}/_update`,
      method: 'POST',
      data: obj.datafeedConfig,
    });
  },

  deleteDatafeed(obj) {
    return http({
      url: `${basePath()}/datafeeds/${obj.datafeedId}`,
      method: 'DELETE',
    });
  },

  forceDeleteDatafeed(obj) {
    return http({
      url: `${basePath()}/datafeeds/${obj.datafeedId}?force=true`,
      method: 'DELETE',
    });
  },

  startDatafeed(obj) {
    const data = {};
    if (obj.start !== undefined) {
      data.start = obj.start;
    }
    if (obj.end !== undefined) {
      data.end = obj.end;
    }
    return http({
      url: `${basePath()}/datafeeds/${obj.datafeedId}/_start`,
      method: 'POST',
      data,
    });
  },

  stopDatafeed(obj) {
    return http({
      url: `${basePath()}/datafeeds/${obj.datafeedId}/_stop`,
      method: 'POST',
    });
  },

  datafeedPreview(obj) {
    return http({
      url: `${basePath()}/datafeeds/${obj.datafeedId}/_preview`,
      method: 'GET',
    });
  },

  validateDetector(obj) {
    return http({
      url: `${basePath()}/anomaly_detectors/_validate/detector`,
      method: 'POST',
      data: obj.detector,
    });
  },

  forecast(obj) {
    const data = {};
    if (obj.duration !== undefined) {
      data.duration = obj.duration;
    }

    return http({
      url: `${basePath()}/anomaly_detectors/${obj.jobId}/_forecast`,
      method: 'POST',
      data,
    });
  },

  overallBuckets(obj) {
    const data = pick(obj, ['topN', 'bucketSpan', 'start', 'end']);
    return http({
      url: `${basePath()}/anomaly_detectors/${obj.jobId}/results/overall_buckets`,
      method: 'POST',
      data,
    });
  },

  hasPrivileges(obj) {
    return http({
      url: `${basePath()}/_has_privileges`,
      method: 'POST',
      data: obj,
    });
  },

  checkMlPrivileges() {
    return http({
      url: `${basePath()}/ml_capabilities`,
      method: 'GET',
    });
  },

  checkManageMLPrivileges() {
    return http({
      url: `${basePath()}/ml_capabilities?ignoreSpaces=true`,
      method: 'GET',
    });
  },

  getNotificationSettings() {
    return http({
      url: `${basePath()}/notification_settings`,
      method: 'GET',
    });
  },

  getFieldCaps(obj) {
    const data = {};
    if (obj.index !== undefined) {
      data.index = obj.index;
    }
    if (obj.fields !== undefined) {
      data.fields = obj.fields;
    }
    return http({
      url: `${basePath()}/indices/field_caps`,
      method: 'POST',
      data,
    });
  },

  recognizeIndex(obj) {
    return http({
      url: `${basePath()}/modules/recognize/${obj.indexPatternTitle}`,
      method: 'GET',
    });
  },

  listDataRecognizerModules() {
    return http({
      url: `${basePath()}/modules/get_module`,
      method: 'GET',
    });
  },

  getDataRecognizerModule(obj) {
    return http({
      url: `${basePath()}/modules/get_module/${obj.moduleId}`,
      method: 'GET',
    });
  },

  dataRecognizerModuleJobsExist(obj) {
    return http({
      url: `${basePath()}/modules/jobs_exist/${obj.moduleId}`,
      method: 'GET',
    });
  },

  setupDataRecognizerConfig(obj) {
    const data = pick(obj, [
      'prefix',
      'groups',
      'indexPatternName',
      'query',
      'useDedicatedIndex',
      'startDatafeed',
      'start',
      'end',
      'jobOverrides',
    ]);

    return http({
      url: `${basePath()}/modules/setup/${obj.moduleId}`,
      method: 'POST',
      data,
    });
  },

  getVisualizerFieldStats(obj) {
    const data = pick(obj, [
      'query',
      'timeFieldName',
      'earliest',
      'latest',
      'samplerShardSize',
      'interval',
      'fields',
      'maxExamples',
    ]);

    return http({
      url: `${basePath()}/data_visualizer/get_field_stats/${obj.indexPatternTitle}`,
      method: 'POST',
      data,
    });
  },

  getVisualizerOverallStats(obj) {
    const data = pick(obj, [
      'query',
      'timeFieldName',
      'earliest',
      'latest',
      'samplerShardSize',
      'aggregatableFields',
      'nonAggregatableFields',
    ]);

    return http({
      url: `${basePath()}/data_visualizer/get_overall_stats/${obj.indexPatternTitle}`,
      method: 'POST',
      data,
    });
  },

  /**
   * Gets a list of calendars
   * @param obj
   * @returns {Promise<unknown>}
   */
  calendars(obj = {}) {
    const { calendarId, calendarIds } = obj;
    let calendarIdsPathComponent = '';
    if (calendarId) {
      calendarIdsPathComponent = `/${calendarId}`;
    } else if (calendarIds) {
      calendarIdsPathComponent = `/${calendarIds.join(',')}`;
    }
    return http({
      url: `${basePath()}/calendars${calendarIdsPathComponent}`,
      method: 'GET',
    });
  },

  addCalendar(obj) {
    return http({
      url: `${basePath()}/calendars`,
      method: 'PUT',
      data: obj,
    });
  },

  updateCalendar(obj) {
    const calendarId = obj && obj.calendarId ? `/${obj.calendarId}` : '';
    return http({
      url: `${basePath()}/calendars${calendarId}`,
      method: 'PUT',
      data: obj,
    });
  },

  deleteCalendar(obj) {
    return http({
      url: `${basePath()}/calendars/${obj.calendarId}`,
      method: 'DELETE',
    });
  },

  mlNodeCount() {
    return http({
      url: `${basePath()}/ml_node_count`,
      method: 'GET',
    });
  },

  mlInfo() {
    return http({
      url: `${basePath()}/info`,
      method: 'GET',
    });
  },

  calculateModelMemoryLimit(obj) {
    const data = pick(obj, [
      'indexPattern',
      'splitFieldName',
      'query',
      'fieldNames',
      'influencerNames',
      'timeFieldName',
      'earliestMs',
      'latestMs',
    ]);

    return http({
      url: `${basePath()}/validate/calculate_model_memory_limit`,
      method: 'POST',
      data,
    });
  },

  getCardinalityOfFields(obj) {
    const data = pick(obj, [
      'index',
      'fieldNames',
      'query',
      'timeFieldName',
      'earliestMs',
      'latestMs',
    ]);

    return http({
      url: `${basePath()}/fields_service/field_cardinality`,
      method: 'POST',
      data,
    });
  },

  getTimeFieldRange(obj) {
    const data = pick(obj, ['index', 'timeFieldName', 'query']);

    return http({
      url: `${basePath()}/fields_service/time_field_range`,
      method: 'POST',
      data,
    });
  },

  esSearch(obj) {
    return http({
      url: `${basePath()}/es_search`,
      method: 'POST',
      data: obj,
    });
  },

  esSearch$(obj) {
    return http$(`${basePath()}/es_search`, {
      method: 'POST',
      body: obj,
    });
  },

  getIndices() {
    const tempBasePath = getBasePath().prepend('/api');
    return http({
      url: `${tempBasePath}/index_management/indices`,
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
