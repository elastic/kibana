/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { http } from '../http_service';

const basePath = chrome.addBasePath('/api/ml');

export const jobs = {
  jobsSummary(jobIds) {
    return http({
      url: `${basePath}/jobs/jobs_summary`,
      method: 'POST',
      data: {
        jobIds,
      },
    });
  },

  jobsWithTimerange(dateFormatTz) {
    return http({
      url: `${basePath}/jobs/jobs_with_timerange`,
      method: 'POST',
      data: {
        dateFormatTz,
      },
    });
  },

  jobs(jobIds) {
    return http({
      url: `${basePath}/jobs/jobs`,
      method: 'POST',
      data: {
        jobIds,
      },
    });
  },

  groups() {
    return http({
      url: `${basePath}/jobs/groups`,
      method: 'GET',
    });
  },

  updateGroups(updatedJobs) {
    return http({
      url: `${basePath}/jobs/update_groups`,
      method: 'POST',
      data: {
        jobs: updatedJobs,
      },
    });
  },

  forceStartDatafeeds(datafeedIds, start, end) {
    return http({
      url: `${basePath}/jobs/force_start_datafeeds`,
      method: 'POST',
      data: {
        datafeedIds,
        start,
        end,
      },
    });
  },

  stopDatafeeds(datafeedIds) {
    return http({
      url: `${basePath}/jobs/stop_datafeeds`,
      method: 'POST',
      data: {
        datafeedIds,
      },
    });
  },

  deleteJobs(jobIds) {
    return http({
      url: `${basePath}/jobs/delete_jobs`,
      method: 'POST',
      data: {
        jobIds,
      },
    });
  },

  closeJobs(jobIds) {
    return http({
      url: `${basePath}/jobs/close_jobs`,
      method: 'POST',
      data: {
        jobIds,
      },
    });
  },

  jobAuditMessages(jobId, from) {
    const jobIdString = jobId !== undefined ? `/${jobId}` : '';
    const fromString = from !== undefined ? `?from=${from}` : '';
    return http({
      url: `${basePath}/job_audit_messages/messages${jobIdString}${fromString}`,
      method: 'GET',
    });
  },

  deletingJobTasks() {
    return http({
      url: `${basePath}/jobs/deleting_jobs_tasks`,
      method: 'GET',
    });
  },

  jobsExist(jobIds) {
    return http({
      url: `${basePath}/jobs/jobs_exist`,
      method: 'POST',
      data: {
        jobIds,
      },
    });
  },

  newJobCaps(indexPatternTitle, isRollup = false) {
    const isRollupString = isRollup === true ? `?rollup=true` : '';
    return http({
      url: `${basePath}/jobs/new_job_caps/${indexPatternTitle}${isRollupString}`,
      method: 'GET',
    });
  },

  newJobLineChart(
    indexPatternTitle,
    timeField,
    start,
    end,
    intervalMs,
    query,
    aggFieldNamePairs,
    splitFieldName,
    splitFieldValue
  ) {
    return http({
      url: `${basePath}/jobs/new_job_line_chart`,
      method: 'POST',
      data: {
        indexPatternTitle,
        timeField,
        start,
        end,
        intervalMs,
        query,
        aggFieldNamePairs,
        splitFieldName,
        splitFieldValue,
      },
    });
  },

  newJobPopulationsChart(
    indexPatternTitle,
    timeField,
    start,
    end,
    intervalMs,
    query,
    aggFieldNamePairs,
    splitFieldName
  ) {
    return http({
      url: `${basePath}/jobs/new_job_population_chart`,
      method: 'POST',
      data: {
        indexPatternTitle,
        timeField,
        start,
        end,
        intervalMs,
        query,
        aggFieldNamePairs,
        splitFieldName,
      },
    });
  },

  getAllJobAndGroupIds() {
    return http({
      url: `${basePath}/jobs/all_jobs_and_group_ids`,
      method: 'GET',
    });
  },

  getLookBackProgress(jobId, start, end) {
    return http({
      url: `${basePath}/jobs/look_back_progress`,
      method: 'POST',
      data: {
        jobId,
        start,
        end,
      },
    });
  },
};
