/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { RequestHandlerContext } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../new_platform/plugin';
// import {
//   anomaliesTableDataSchema,
//   categoryDefinitionSchema,
//   categoryExamplesSchema,
//   maxAnomalyScoreSchema,
//   partitionFieldValuesSchema,
// } from '../new_platform/job_service_schema';

// @ts-ignore
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/force_start_datafeeds',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { forceStartDatafeeds } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/stop_datafeeds',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { stopDatafeeds } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/delete_jobs',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { deleteJobs } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/close_jobs',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { closeJobs } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs_summary',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { jobsSummary } = jobServiceProvider(context);
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
   * @api {post} /api/ml/jobs/jobs_with_timerange
   * @apiName JobsWithTimerange
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs_with_timerange',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { jobsWithTimerange } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { createFullJobsList } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.get(
    {
      path: '/api/ml/jobs/groups',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { getAllGroups } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/update_groups',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { updateGroups } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.get(
    {
      path: '/api/ml/jobs/deleting_jobs_tasks',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { deletingJobTasks } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/jobs_exist',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { jobsExist } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.get(
    {
      path: '/api/ml/jobs/new_job_caps/{indexPattern}',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { indexPattern } = request.params;
        const isRollup = request.query.rollup === 'true';
        const { newJobCaps } = jobServiceProvider(context, request);
        const resp = await newJobCaps(indexPattern, isRollup);

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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/new_job_line_chart',
      validate: {
        body: schema.any(),
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
        const { newJobLineChart } = jobServiceProvider(context, request);
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/new_job_population_chart',
      validate: {
        body: schema.any(),
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
        const { newJobPopulationChart } = jobServiceProvider(context, request);
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
   * @apiDescription
   */
  router.get(
    {
      path: '/api/ml/jobs/all_jobs_and_group_ids',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { getAllJobAndGroupIds } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/look_back_progress',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { getLookBackProgress } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/categorization_field_examples',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { validateCategoryExamples } = jobServiceProvider(context);
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
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/jobs/top_categories',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { topCategories } = jobServiceProvider(context);
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
