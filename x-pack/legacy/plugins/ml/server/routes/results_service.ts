/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../new_platform/plugin';
import {
  anomaliesTableDataSchema,
  categoryDefinitionSchema,
  categoryExamplesSchema,
  maxAnomalyScoreSchema,
  partitionFieldValuesSchema,
} from '../new_platform/results_service_schema';
import { resultsServiceProvider } from '../models/results_service';

function getAnomaliesTableData(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context);
  const {
    jobIds,
    criteriaFields,
    influencers,
    aggregationInterval,
    threshold,
    earliestMs,
    latestMs,
    dateFormatTz,
    maxRecords,
    maxExamples,
    influencersFilterQuery,
  } = payload;
  return rs.getAnomaliesTableData(
    jobIds,
    criteriaFields,
    influencers,
    aggregationInterval,
    threshold,
    earliestMs,
    latestMs,
    dateFormatTz,
    maxRecords,
    maxExamples,
    influencersFilterQuery
  );
}

function getCategoryDefinition(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context);
  return rs.getCategoryDefinition(payload.jobId, payload.categoryId);
}

function getCategoryExamples(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context);
  const { jobId, categoryIds, maxExamples } = payload;
  return rs.getCategoryExamples(jobId, categoryIds, maxExamples);
}

function getMaxAnomalyScore(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context);
  const { jobIds, earliestMs, latestMs } = payload;
  return rs.getMaxAnomalyScore(jobIds, earliestMs, latestMs);
}

function getPartitionFieldsValues(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context);
  const { jobId, searchTerm, criteriaFields, earliestMs, latestMs } = payload;
  return rs.getPartitionFieldsValues(jobId, searchTerm, criteriaFields, earliestMs, latestMs);
}

/**
 * Routes for results service
 */
export function resultsServiceRoutes({ xpackMainPlugin, router }: RouteInitialization) {
  /**
   * @apiGroup ResultsService
   *
   * @api {post} /api/ml/results/anomalies_table_data Prepare anomalies records for table display
   * @apiName GetAnomaliesTableData
   * @apiDescription Retrieves anomaly records for an anomaly detection job and formats them for anomalies table display
   */
  router.post(
    {
      path: '/api/ml/results/anomalies_table_data',
      validate: {
        body: schema.object(anomaliesTableDataSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const resp = await getAnomaliesTableData(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /api/ml/results/category_definition Returns category definition
   * @apiName GetCategoryDefinition
   * @apiDescription Returns the definition of the category with the specified ID and job ID
   */
  router.post(
    {
      path: '/api/ml/results/category_definition',
      validate: {
        body: schema.object(categoryDefinitionSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const resp = await getCategoryDefinition(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /api/ml/results/max_anomaly_score Returns the maximum anomaly_score
   * @apiName GetMaxAnomalyScore
   * @apiDescription Returns the maximum anomaly score of the bucket results for the request job ID(s) and time range
   */
  router.post(
    {
      path: '/api/ml/results/max_anomaly_score',
      validate: {
        body: schema.object(maxAnomalyScoreSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const resp = await getMaxAnomalyScore(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /api/ml/results/category_examples Returns category examples
   * @apiName GetCategoryExamples
   * @apiDescription Returns examples for the categories with the specified IDs from the job with the supplied ID
   */
  router.post(
    {
      path: '/api/ml/results/category_examples',
      validate: {
        body: schema.object(categoryExamplesSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const resp = await getCategoryExamples(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /api/ml/results/partition_fields_values Returns partition fields values
   * @apiName GetPartitionFieldsValues
   * @apiDescription Returns the partition fields with values that match the provided criteria for the specified job ID.
   */
  router.post(
    {
      path: '/api/ml/results/partition_fields_values',
      validate: {
        body: schema.object(partitionFieldValuesSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const resp = await getPartitionFieldsValues(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
