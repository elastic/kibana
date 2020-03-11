/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { http } from '../http_service';

import { basePath } from './index';
import { Dictionary } from '../../../../common/types/common';
import { MlJobWithTimeRange, MlSummaryJobs } from '../../../../common/types/anomaly_detection_jobs';
import { JobMessage } from '../../../../common/types/audit_message';
import { AggFieldNamePair } from '../../../../common/types/fields';
import { ExistingJobsAndGroups } from '../job_service';
import {
  CategorizationAnalyzer,
  CategoryFieldExample,
  FieldExampleCheck,
} from '../../../../common/types/categories';
import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '../../../../common/constants/new_job';
import { Category } from '../../../../common/types/categories';

export const jobs = {
  jobsSummary(jobIds: string[]): Promise<MlSummaryJobs> {
    const body = JSON.stringify({ jobIds });
    return http({
      path: `${basePath()}/jobs/jobs_summary`,
      method: 'POST',
      body,
    });
  },

  jobsWithTimerange(
    dateFormatTz: string
  ): Promise<{ jobs: MlJobWithTimeRange[]; jobsMap: Dictionary<MlJobWithTimeRange> }> {
    const body = JSON.stringify({ dateFormatTz });
    return http({
      path: `${basePath()}/jobs/jobs_with_time_range`,
      method: 'POST',
      body,
    });
  },

  jobs(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return http({
      path: `${basePath()}/jobs/jobs`,
      method: 'POST',
      body,
    });
  },

  groups() {
    return http({
      path: `${basePath()}/jobs/groups`,
      method: 'GET',
    });
  },

  updateGroups(updatedJobs: string[]) {
    const body = JSON.stringify({ updatedJobs });
    return http({
      path: `${basePath()}/jobs/update_groups`,
      method: 'POST',
      body,
    });
  },

  forceStartDatafeeds(datafeedIds: string[], start: string, end: string) {
    const body = JSON.stringify({
      datafeedIds,
      start,
      end,
    });

    return http({
      path: `${basePath()}/jobs/force_start_datafeeds`,
      method: 'POST',
      body,
    });
  },

  stopDatafeeds(datafeedIds: string[]) {
    const body = JSON.stringify({ datafeedIds });
    return http({
      path: `${basePath()}/jobs/stop_datafeeds`,
      method: 'POST',
      body,
    });
  },

  deleteJobs(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return http({
      path: `${basePath()}/jobs/delete_jobs`,
      method: 'POST',
      body,
    });
  },

  closeJobs(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return http({
      path: `${basePath()}/jobs/close_jobs`,
      method: 'POST',
      body,
    });
  },

  jobAuditMessages(jobId: string, from?: number): Promise<JobMessage[]> {
    const jobIdString = jobId !== undefined ? `/${jobId}` : '';
    const query = from !== undefined ? { from } : {};
    return http({
      path: `${basePath()}/job_audit_messages/messages${jobIdString}`,
      method: 'GET',
      query,
    });
  },

  deletingJobTasks() {
    return http({
      path: `${basePath()}/jobs/deleting_jobs_tasks`,
      method: 'GET',
    });
  },

  jobsExist(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return http({
      path: `${basePath()}/jobs/jobs_exist`,
      method: 'POST',
      body,
    });
  },

  newJobCaps(indexPatternTitle: string, isRollup: boolean = false) {
    const query = isRollup === true ? { rollup: true } : {};
    return http({
      path: `${basePath()}/jobs/new_job_caps/${indexPatternTitle}`,
      method: 'GET',
      query,
    });
  },

  newJobLineChart(
    indexPatternTitle: string,
    timeField: string,
    start: number,
    end: number,
    intervalMs: number,
    query: any,
    aggFieldNamePairs: AggFieldNamePair[],
    splitFieldName: string | null,
    splitFieldValue: string | null
  ) {
    const body = JSON.stringify({
      indexPatternTitle,
      timeField,
      start,
      end,
      intervalMs,
      query,
      aggFieldNamePairs,
      splitFieldName,
      splitFieldValue,
    });
    return http({
      path: `${basePath()}/jobs/new_job_line_chart`,
      method: 'POST',
      body,
    });
  },

  newJobPopulationsChart(
    indexPatternTitle: string,
    timeField: string,
    start: number,
    end: number,
    intervalMs: number,
    query: any,
    aggFieldNamePairs: AggFieldNamePair[],
    splitFieldName: string
  ) {
    const body = JSON.stringify({
      indexPatternTitle,
      timeField,
      start,
      end,
      intervalMs,
      query,
      aggFieldNamePairs,
      splitFieldName,
    });
    return http({
      path: `${basePath()}/jobs/new_job_population_chart`,
      method: 'POST',
      body,
    });
  },

  getAllJobAndGroupIds(): Promise<ExistingJobsAndGroups> {
    return http({
      path: `${basePath()}/jobs/all_jobs_and_group_ids`,
      method: 'GET',
    });
  },

  getLookBackProgress(
    jobId: string,
    start: number,
    end: number
  ): Promise<{ progress: number; isRunning: boolean; isJobClosed: boolean }> {
    const body = JSON.stringify({
      jobId,
      start,
      end,
    });
    return http({
      path: `${basePath()}/jobs/look_back_progress`,
      method: 'POST',
      body,
    });
  },

  categorizationFieldExamples(
    indexPatternTitle: string,
    query: any,
    size: number,
    field: string,
    timeField: string,
    start: number,
    end: number,
    analyzer: CategorizationAnalyzer
  ): Promise<{
    examples: CategoryFieldExample[];
    sampleSize: number;
    overallValidStatus: CATEGORY_EXAMPLES_VALIDATION_STATUS;
    validationChecks: FieldExampleCheck[];
  }> {
    const body = JSON.stringify({
      indexPatternTitle,
      query,
      size,
      field,
      timeField,
      start,
      end,
      analyzer,
    });
    return http({
      path: `${basePath()}/jobs/categorization_field_examples`,
      method: 'POST',
      body,
    });
  },

  topCategories(
    jobId: string,
    count: number
  ): Promise<{ total: number; categories: Array<{ count?: number; category: Category }> }> {
    const body = JSON.stringify({ jobId, count });
    return http({
      path: `${basePath()}/jobs/top_categories`,
      method: 'POST',
      body,
    });
  },
};
