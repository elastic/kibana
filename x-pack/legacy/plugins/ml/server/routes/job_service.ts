/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../new_platform/plugin';
import {
  categorizationFieldExamplesSchema,
  chartSchema,
  datafeedIdsSchema,
  forceStartDatafeedSchema,
  jobIdsSchema,
  jobsWithTimerangeSchema,
  lookBackProgressSchema,
  topCategoriesSchema,
  updateGroupsSchema,
} from '../new_platform/job_service_schema';
// @ts-ignore no declaration module
import { jobServiceProvider } from '../models/job_service';

/**
 * Routes for job service
 */
export function jobServiceRoutes({ xpackMainPlugin, router }: RouteInitialization) {
  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/force_start_datafeeds
   * @apiName ForceStartDatafeeds
   * @apiDescription Starts one or more datafeeds
   */
  router.post(
    {
      path: '/api/ml/jobs/force_start_datafeeds',
      validate: {
        body: schema.object(forceStartDatafeedSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { forceStartDatafeeds } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { datafeedIds, start, end } = request.body;
        const resp = await forceStartDatafeeds(datafeedIds, start, end);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/stop_datafeeds
   * @apiName StopDatafeeds
   * @apiDescription Stops one or more datafeeds
   */
  router.post(
    {
      path: '/api/ml/jobs/stop_datafeeds',
      validate: {
        body: schema.object(datafeedIdsSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { stopDatafeeds } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { datafeedIds } = request.body;
        const resp = await stopDatafeeds(datafeedIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/delete_jobs
   * @apiName DeleteJobs
   * @apiDescription Deletes an existing anomaly detection job
   */
  router.post(
    {
      path: '/api/ml/jobs/delete_jobs',
      validate: {
        body: schema.object(jobIdsSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { deleteJobs } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobIds } = request.body;
        const resp = await deleteJobs(jobIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/close_jobs
   * @apiName CloseJobs
   * @apiDescription Closes one or more anomaly detection jobs
   */
  router.post(
    {
      path: '/api/ml/jobs/close_jobs',
      validate: {
        body: schema.object(jobIdsSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { closeJobs } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobIds } = request.body;
        const resp = await closeJobs(jobIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/jobs_summary
   * @apiName JobsSummary
   * @apiDescription Creates a summary jobs list. Jobs include job stats, datafeed stats, and calendars.
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs_summary',
      validate: {
        body: schema.object(jobIdsSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { jobsSummary } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobIds } = request.body;
        const resp = await jobsSummary(jobIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/jobs_with_time_range
   * @apiName JobsWithTimerange
   * @apiDescription Creates a list of jobs with data about the job's timerange
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs_with_time_range',
      validate: {
        body: schema.object(jobsWithTimerangeSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { jobsWithTimerange } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { dateFormatTz } = request.body;
        const resp = await jobsWithTimerange(dateFormatTz);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/jobs
   * @apiName CreateFullJobsList
   * @apiDescription Creates a list of jobs
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs',
      validate: {
        body: schema.object(jobIdsSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { createFullJobsList } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobIds } = request.body;
        const resp = await createFullJobsList(jobIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {get} /api/ml/jobs/groups
   * @apiName GetAllGroups
   * @apiDescription Returns array of group objects with job ids listed for each group
   */
  router.get(
    {
      path: '/api/ml/jobs/groups',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { getAllGroups } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const resp = await getAllGroups();

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/update_groups
   * @apiName UpdateGroups
   * @apiDescription Updates 'groups' property of an anomaly detection job
   */
  router.post(
    {
      path: '/api/ml/jobs/update_groups',
      validate: {
        body: schema.object(updateGroupsSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { updateGroups } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobs } = request.body;
        const resp = await updateGroups(jobs);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {get} /api/ml/jobs/deleting_jobs_tasks
   * @apiName DeletingJobTasks
   * @apiDescription Gets the ids of deleting anomaly detection jobs
   */
  router.get(
    {
      path: '/api/ml/jobs/deleting_jobs_tasks',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { deletingJobTasks } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const resp = await deletingJobTasks();

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/jobs_exist
   * @apiName JobsExist
   * @apiDescription Checks if each of the jobs in the specified list of IDs exist
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs_exist',
      validate: {
        body: schema.object(jobIdsSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { jobsExist } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobIds } = request.body;
        const resp = await jobsExist(jobIds);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {get} /api/ml/jobs/new_job_caps/:indexPattern
   * @apiName NewJobCaps
   * @apiDescription Retrieve the capabilities of fields for indices
   */
  router.get(
    {
      path: '/api/ml/jobs/new_job_caps/{indexPattern}',
      validate: {
        params: schema.object({ indexPattern: schema.string() }),
        query: schema.maybe(schema.object({ rollup: schema.maybe(schema.string()) })),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { indexPattern } = request.params;
        const isRollup = request.query.rollup === 'true';
        const savedObjectsClient = context.core.savedObjects.client;
        const { newJobCaps } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const resp = await newJobCaps(indexPattern, isRollup, savedObjectsClient);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/new_job_line_chart
   * @apiName NewJobLineChart
   * @apiDescription Returns line chart data for anomaly detection job
   */
  router.post(
    {
      path: '/api/ml/jobs/new_job_line_chart',
      validate: {
        body: schema.object(chartSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
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
        } = request.body;

        const { newJobLineChart } = jobServiceProvider(
          context.ml!.mlClient.callAsCurrentUser,
          request
        );
        const resp = await newJobLineChart(
          indexPatternTitle,
          timeField,
          start,
          end,
          intervalMs,
          query,
          aggFieldNamePairs,
          splitFieldName,
          splitFieldValue
        );

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/new_job_population_chart
   * @apiName NewJobPopulationChart
   * @apiDescription Returns population job chart data
   */
  router.post(
    {
      path: '/api/ml/jobs/new_job_population_chart',
      validate: {
        body: schema.object(chartSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const {
          indexPatternTitle,
          timeField,
          start,
          end,
          intervalMs,
          query,
          aggFieldNamePairs,
          splitFieldName,
        } = request.body;

        const { newJobPopulationChart } = jobServiceProvider(
          context.ml!.mlClient.callAsCurrentUser
        );
        const resp = await newJobPopulationChart(
          indexPatternTitle,
          timeField,
          start,
          end,
          intervalMs,
          query,
          aggFieldNamePairs,
          splitFieldName
        );

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {get} /api/ml/jobs/all_jobs_and_group_ids
   * @apiName GetAllJobAndGroupIds
   * @apiDescription Returns a list of all job IDs and all group IDs
   */
  router.get(
    {
      path: '/api/ml/jobs/all_jobs_and_group_ids',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { getAllJobAndGroupIds } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const resp = await getAllJobAndGroupIds();

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/look_back_progress
   * @apiName GetLookBackProgress
   * @apiDescription Returns current progress of anomaly detection job
   */
  router.post(
    {
      path: '/api/ml/jobs/look_back_progress',
      validate: {
        body: schema.object(lookBackProgressSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { getLookBackProgress } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobId, start, end } = request.body;
        const resp = await getLookBackProgress(jobId, start, end);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/categorization_field_examples
   * @apiName ValidateCategoryExamples
   * @apiDescription Validates category examples
   */
  router.post(
    {
      path: '/api/ml/jobs/categorization_field_examples',
      validate: {
        body: schema.object(categorizationFieldExamplesSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { validateCategoryExamples } = jobServiceProvider(
          context.ml!.mlClient.callAsCurrentUser
        );
        const {
          indexPatternTitle,
          timeField,
          query,
          size,
          field,
          start,
          end,
          analyzer,
        } = request.body;

        const resp = await validateCategoryExamples(
          indexPatternTitle,
          query,
          size,
          field,
          timeField,
          start,
          end,
          analyzer
        );

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/top_categories
   * @apiName TopCategories
   * @apiDescription Returns list of top categories
   */
  router.post(
    {
      path: '/api/ml/jobs/top_categories',
      validate: {
        body: schema.object(topCategoriesSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { topCategories } = jobServiceProvider(context.ml!.mlClient.callAsCurrentUser);
        const { jobId, count } = request.body;
        const resp = await topCategories(jobId, count);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
