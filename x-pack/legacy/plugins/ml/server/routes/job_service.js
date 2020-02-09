/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { jobServiceProvider } from '../models/job_service';

export function jobServiceRoutes({ commonRouteConfig, elasticsearchPlugin, route }) {
  route({
    method: 'POST',
    path: '/api/ml/jobs/force_start_datafeeds',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { forceStartDatafeeds } = jobServiceProvider(callWithRequest);
      const { datafeedIds, start, end } = request.payload;
      return forceStartDatafeeds(datafeedIds, start, end).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/stop_datafeeds',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { stopDatafeeds } = jobServiceProvider(callWithRequest);
      const { datafeedIds } = request.payload;
      return stopDatafeeds(datafeedIds).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/delete_jobs',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { deleteJobs } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return deleteJobs(jobIds).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/close_jobs',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { closeJobs } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return closeJobs(jobIds).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/jobs_summary',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { jobsSummary } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return jobsSummary(jobIds).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/jobs_with_timerange',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { jobsWithTimerange } = jobServiceProvider(callWithRequest);
      const { dateFormatTz } = request.payload;
      return jobsWithTimerange(dateFormatTz).catch(resp => {
        wrapError(resp);
      });
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/jobs',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { createFullJobsList } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return createFullJobsList(jobIds).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/jobs/groups',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { getAllGroups } = jobServiceProvider(callWithRequest);
      return getAllGroups().catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/update_groups',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { updateGroups } = jobServiceProvider(callWithRequest);
      const { jobs } = request.payload;
      return updateGroups(jobs).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/jobs/deleting_jobs_tasks',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { deletingJobTasks } = jobServiceProvider(callWithRequest);
      return deletingJobTasks().catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/jobs_exist',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { jobsExist } = jobServiceProvider(callWithRequest);
      const { jobIds } = request.payload;
      return jobsExist(jobIds).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/jobs/new_job_caps/{indexPattern}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { indexPattern } = request.params;
      const isRollup = request.query.rollup === 'true';
      const { newJobCaps } = jobServiceProvider(callWithRequest, request);
      return newJobCaps(indexPattern, isRollup).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/new_job_line_chart',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const {
        indexPatternTitle,
        timeField,
        start,
        end,
        intervalMs,
        query,
        aggFieldNamePairs,
        splitFieldName,
        splitFieldValue,
      } = request.payload;
      const { newJobLineChart } = jobServiceProvider(callWithRequest, request);
      return newJobLineChart(
        indexPatternTitle,
        timeField,
        start,
        end,
        intervalMs,
        query,
        aggFieldNamePairs,
        splitFieldName,
        splitFieldValue
      ).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/new_job_population_chart',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const {
        indexPatternTitle,
        timeField,
        start,
        end,
        intervalMs,
        query,
        aggFieldNamePairs,
        splitFieldName,
      } = request.payload;
      const { newJobPopulationChart } = jobServiceProvider(callWithRequest, request);
      return newJobPopulationChart(
        indexPatternTitle,
        timeField,
        start,
        end,
        intervalMs,
        query,
        aggFieldNamePairs,
        splitFieldName
      ).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/jobs/all_jobs_and_group_ids',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { getAllJobAndGroupIds } = jobServiceProvider(callWithRequest);
      return getAllJobAndGroupIds().catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/look_back_progress',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { getLookBackProgress } = jobServiceProvider(callWithRequest);
      const { jobId, start, end } = request.payload;
      return getLookBackProgress(jobId, start, end).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/categorization_field_examples',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { validateCategoryExamples } = jobServiceProvider(callWithRequest);
      const {
        indexPatternTitle,
        timeField,
        query,
        size,
        field,
        start,
        end,
        analyzer,
      } = request.payload;
      return validateCategoryExamples(
        indexPatternTitle,
        query,
        size,
        field,
        timeField,
        start,
        end,
        analyzer
      ).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/jobs/top_categories',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { topCategories } = jobServiceProvider(callWithRequest);
      const { jobId, count } = request.payload;
      return topCategories(jobId, count).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });
}
